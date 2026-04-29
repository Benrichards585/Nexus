/**
 * refresh-deploy-token.mjs
 *
 * Syncs the Azure Static Web App deployment token → GitHub Actions secret.
 * Run any time deployments start failing with "No matching Static Web App" errors.
 *
 * Usage:
 *   npm run refresh-token -- ghp_YOURPAT
 *
 * The GitHub PAT needs scopes: repo + workflow
 * Generate one at: https://github.com/settings/tokens
 */

import { execSync } from 'child_process';
import sodium from 'tweetsodium';

const GITHUB_OWNER = 'Benrichards585';
const GITHUB_REPO  = 'Nexus';
const SECRET_NAME  = 'AZURE_STATIC_WEB_APPS_API_TOKEN';
const AZURE_APP    = 'OCM-Nexus';
const AZURE_RG     = 'OCMNexus';

const GITHUB_PAT = process.argv[2] || process.env.GITHUB_PAT;
if (!GITHUB_PAT) {
  console.error('\n❌  GitHub PAT required.\n');
  console.error('Usage:  npm run refresh-token -- ghp_YOURTOKEN\n');
  process.exit(1);
}

// Step 1: Get deployment token from Azure
console.log('🔑  Fetching deployment token from Azure...');
let deploymentToken;
try {
  deploymentToken = execSync(
    `az staticwebapp secrets list -n ${AZURE_APP} -g ${AZURE_RG} --query "properties.apiKey" -o tsv`,
    { encoding: 'utf8' }
  ).trim();
  if (!deploymentToken) throw new Error('Empty token returned');
  console.log(`✅  Token retrieved (${deploymentToken.length} chars)`);
} catch (e) {
  console.error('❌  Failed to get Azure token. Are you logged in?  Run: az login');
  process.exit(1);
}

// Step 2: Get GitHub repo public key
console.log('🔐  Fetching GitHub repo public key...');
const keyRes = await fetch(
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/secrets/public-key`,
  { headers: { Authorization: `Bearer ${GITHUB_PAT}`, 'User-Agent': 'ocm-nexus-refresh' } }
);
if (!keyRes.ok) {
  console.error(`❌  GitHub API error ${keyRes.status}: ${await keyRes.text()}`);
  process.exit(1);
}
const { key, key_id } = await keyRes.json();
console.log(`✅  Got public key (key_id: ${key_id})`);

// Step 3: Encrypt with libsodium sealed box
const encryptedBytes = sodium.seal(Buffer.from(deploymentToken), Buffer.from(key, 'base64'));
const encryptedValue = Buffer.from(encryptedBytes).toString('base64');

// Step 4: Update the GitHub secret
console.log(`📤  Updating GitHub secret "${SECRET_NAME}"...`);
const res = await fetch(
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/secrets/${SECRET_NAME}`,
  {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_PAT}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ocm-nexus-refresh',
    },
    body: JSON.stringify({ encrypted_value: encryptedValue, key_id }),
  }
);

if (res.status === 204 || res.status === 201) {
  console.log(`\n✅  Secret updated! Next push to main will deploy cleanly.\n`);
} else {
  console.error(`❌  Failed: ${res.status} — ${await res.text()}`);
  process.exit(1);
}
