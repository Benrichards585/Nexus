# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

OCM Nexus is a React web application for Cognizant OCM (Organizational Change Management) practitioners. It generates AI-powered change management deliverables (stakeholder maps, impact assessments, communications, training plans). **Benjamin Richards is the sole architect and product owner. All architectural decisions, release authority, and merge control belong to him. Do not make structural changes without explicit approval.**

## Commands

```bash
npm install       # install dependencies
npm start         # start dev server (craco start, port 3000)
npm run build     # production build — must succeed before any PR
npx craco build   # equivalent to npm run build
npm run refresh-token -- ghp_YOURPAT  # sync Azure deployment token to GitHub secret
```

There are no test commands — the project has no test suite yet.

**Before submitting a PR:** run `npx craco build` locally and confirm it exits cleanly. ESLint warnings are acceptable; errors are not. GitHub Actions runs with `CI=true`, which promotes all ESLint warnings to hard errors — unused variables declared in destructuring will fail the build even if they pass locally.

## Module Architecture

This is the most important section. Every new feature in OCM Nexus is a **module** — a self-contained folder inside `src/modules/`.

### Folder structure

```
src/modules/MyModuleName/
├── schema.js          # constants, empty-row factory, AI prompts — define this FIRST
├── InputForm.jsx      # table/form UI for manual data entry
├── AIAssist.jsx       # AI generation panel
├── index.jsx          # main entry point — manages state, renders tabs, calls setData()
├── ExportControls.jsx # (optional) PDF/Excel/PowerPoint export buttons
└── Visualization.jsx  # (optional) charts or visual output
```

Copy `src/modules/_ModuleTemplate/` as your starting point. It is fully annotated with instructions.

**Current module roster:**
- Active: Change Impact Assessment, Stakeholder Analysis, Communications Generator, Training Generator
- Coming soon (registered, no component yet): Change Readiness Assessment (`change-readiness`), Training Strategy (`training-strategy`)

### Module contract

`Workspace.jsx` mounts the active module like this:

```jsx
<ModuleComponent
  data={moduleData}        // the module's persisted data (or null on first load)
  setData={setModuleData}  // writes data back to the initiative in AppContext
  initiative={initiative}  // the full initiative object — pass to AIAssist
  moduleId={activeModuleId} // the module's registry ID — pass to AIAssist
/>
```

The module must persist its state back via `setData()` in a `useEffect`:

```jsx
useEffect(() => {
  setData({ rows, aiInsights });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [rows, aiInsights]);
```

### Registering a module

`src/modules/index.js` is the **only file outside the module folder** that changes during module development. Add one entry to `moduleRegistry`:

```js
{
  id: 'my-module-name',        // kebab-case, must be unique
  label: 'My Module Name',     // shown in sidebar
  icon: SomeLucideIcon,
  component: MyModuleName,     // imported from ./MyModuleName
  description: 'One sentence describing what this module produces.',
  status: 'active',            // or 'coming-soon' (renders but no component)
}
```

### Context summarizer (required if module stores data AI should know about)

When a module produces data that other modules' AI should reference (stakeholders, impacts, etc.), register a summarizer in `src/utils/initiativeContext.js`. Add a `summarize*` function and register it in `MODULE_SUMMARIZERS`. This file's registry section must not be modified otherwise.

## AI Rules

### JSON-only responses

Every AI generation must return a defined JSON structure. No freeform text from the model. Define the JSON schema in `schema.js` before writing `AIAssist.jsx`. Parse with the bracket-counting helper (preferred — handles trailing text with braces correctly):

```js
function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.substring(start, i + 1); }
  }
  return null;
}
const jsonStr = extractFirstJsonObject(text);
if (!jsonStr) throw new Error('Could not parse AI response');
const parsed = JSON.parse(jsonStr);
```

The greedy regex `result.match(/\{[\s\S]*\}/)` in CLAUDE.md templates is acceptable for simple modules but fails when the response contains trailing text with braces. Use the bracket-counting version for any module with a complex schema.

### Always use `enhancePromptWithContext()`

Every `callClaude()` call in a module must wrap the system prompt:

```js
import { enhancePromptWithContext } from '../../utils/initiativeContext';

enhancePromptWithContext(AI_SYSTEM_PROMPT, initiative, moduleId)
```

This injects the full initiative context (data from all other modules) so Claude understands the broader change landscape. Never pass a bare system prompt directly.

### Required `callClaude()` parameters

```js
callClaude({
  model: 'claude-sonnet-4-20250514',  // see model guidance below
  max_tokens: 4096,                   // see token ceiling below — do not exceed 4096
  system: enhancePromptWithContext(AI_SYSTEM_PROMPT, initiative, moduleId),
  messages: [{ role: 'user', content: userMessage }],
  apiKey,
  proxyAvailable,
  appPassword: accessPassword,   // required — do not omit
  onUsage: recordUsage,          // required — do not omit
})
```

**Model selection:** Use `claude-sonnet-4-20250514` for modules that generate short, structured output (communications, stakeholder insights, impact summaries). Use `claude-haiku-4-5-20251001` for modules that process large source documents (Training Generator) — Haiku is significantly faster and reduces the risk of hitting the network timeout. The AIChat refinement panel always uses Sonnet regardless of which model generated the initial output.

### Required `useApp()` destructure in every `AIAssist.jsx`

```js
const { apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage,
        canMakeAIRequest, passwordRequired, accessGranted } = useApp();
```

Every `AIAssist.jsx` must render three guard states before any AI UI: `!aiEnabled`, `passwordRequired && !accessGranted`, and `!canMakeAIRequest`. Copy these blocks verbatim from any existing module — do not invent new patterns.

## Deployment & Network Constraints

These constraints are real, tested limits discovered in production. Violating them causes silent failures that are difficult to diagnose.

### User model

All users authenticate via the **team passphrase** through the org proxy. There are no personal API key users. Do not add UI, messaging, or code paths that reference personal API keys. The Settings drawer retains the API key field for emergency fallback only — do not surface it in module UI or help text.

Authenticated users (password holders) bypass the daily 20,000-token budget. Unauthenticated users hitting the org proxy directly are blocked. This logic lives in `AppContext.jsx`.

### Corporate SSL proxy

Cognizant's corporate network runs an SSL inspection proxy that intercepts and re-encrypts all outbound HTTPS traffic. This proxy enforces an effective timeout of approximately **25 seconds** on requests, regardless of the Azure Function's configured 10-minute timeout (`api/host.json`).

When a request exceeds this threshold the proxy kills the connection. The Azure SWA routing layer returns the plain-text string `Backend call failure` as a 500 response — **this string does not appear anywhere in our function code**. If you see it, the cause is always a request that took too long, not a bug in `api/messages/index.js`.

### max_tokens ceiling

**4096 is the hard safe ceiling for all modules.** This is not a design choice — it is the empirically tested limit for the corporate proxy environment:

| Value | Result |
|---|---|
| 4096 | Stable. Used by all modules. |
| 6000 | `Backend call failure` (proxy timeout) |
| 8192 | `Backend call failure` (proxy timeout) |

If a module's output is being truncated at 4096 tokens, the fix is to make the AI prompt produce more concise output — not to raise the token limit. Add explicit conciseness instructions to the schema (e.g. "max 3 bullets per section", "max 5 steps per section").

### Source document size (Training Generator)

The Training Generator sends source material in the user message. Tested limits:

| Size | Behaviour |
|---|---|
| < 30K chars | Reliable. Fast. |
| 30K–80K chars | Works. May be slow. |
| 80K–120K chars | Warn user: "may take 45–60 seconds" |
| > 120K chars | Soft cap applied — only first 120K chars sent |

Large source documents increase the input token count, which increases Anthropic processing time, which increases the risk of hitting the 25-second proxy timeout. Recommend users trim source material to the most relevant sections.

### Diagnosing 500 errors

| Error shown in UI | Likely cause | Where to look |
|---|---|---|
| `API request failed (500)` | `Backend call failure` from proxy timeout | Reduce max_tokens or source size |
| `Access denied. Invalid or missing application password.` | Wrong or missing passphrase | User needs to re-enter passphrase in Settings |
| `Server API key not configured` | ANTHROPIC_API_KEY missing from Azure Application Settings | Azure Portal → Static Web App → Configuration |
| `Could not parse AI response` | AI output truncated before JSON closed | Reduce max_tokens demand via prompt conciseness rules |
| `Model not allowed` | Model name not in `ALLOWED_MODELS` in `api/messages/index.js` | Check model string matches exactly |

## Export Branding

All PDF exports must use the Cognizant header pattern. Copy this block into any `ExportControls.jsx`:

```js
const pdf = new jsPDF('l', 'mm', 'a4');  // landscape; use 'p' for portrait
const pageWidth = pdf.internal.pageSize.getWidth();

// Navy header bar — Cognizant brand navy. Always use #000048, never the old Nexus #1A1F36.
pdf.setFillColor(0, 0, 72);
pdf.rect(0, 0, pageWidth, 26, 'F');

// Teal "cognizant" wordmark
pdf.setFont('helvetica', 'normal');
pdf.setFontSize(9);
pdf.setTextColor(4, 152, 183);
pdf.text('cognizant', 14, 9);

// Pipe separator
pdf.setTextColor(255, 255, 255);
pdf.setFontSize(7);
pdf.text('|', 44, 9);

// "OCM Nexus" label
pdf.setTextColor(180, 180, 200);
pdf.text('OCM Nexus', 48, 9);

// Module title (white, larger)
pdf.setTextColor(255, 255, 255);
pdf.setFontSize(14);
pdf.text('Your Module Title', 14, 20);

// Date (right-aligned, muted)
pdf.setFontSize(8);
pdf.setTextColor(180, 180, 200);
pdf.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - 14, 20, { align: 'right' });
```

Content begins at `yPos = 36`.

## Branch Naming

All contributor work happens on a feature branch:

```
feature/[module-name-in-kebab-case]
```

Examples: `feature/change-readiness-assessment`, `feature/training-strategy`. No contributor commits directly to `main`. Only Ben Richards merges to main.

## Files That Must Not Be Modified Without Ben's Approval

These files are architectural — changes here affect every module and the entire application:

| File | Why it's off-limits |
|---|---|
| `src/context/AppContext.jsx` | Single source of truth for all state, AI access, token budget |
| `src/pages/Workspace.jsx` | Module mounting, routing, initiative overview |
| `src/App.js` | Routing structure, providers |
| `src/utils/aiClient.js` | AI proxy logic, password header, usage tracking |
| `src/utils/initiativeContext.js` | Cross-module AI context — add summarizers only, do not touch the `enhancePromptWithContext` function or module loop |
| `src/components/Header.jsx` | Global header, usage meter |
| `src/components/AIChat.jsx` | Shared conversational refinement component |
| `src/components/SettingsDrawer.jsx` | API key, passphrase gate UI |
| `src/components/Sidebar.jsx` | Module navigation |
| `api/messages/index.js` | Azure Function proxy — password validation and Anthropic forwarding |
| `src/modules/index.js` | Module registry — add entries only, do not change the structure |

## What Not To Do

- **Do not reference personal API keys in module UI or help text.** All users authenticate via the team passphrase. The API key path exists in `aiClient.js` as a fallback but must not be surfaced to users.
- **Do not raise max_tokens above 4096.** Values of 6000 and 8192 have been tested and both cause `Backend call failure` through the corporate proxy. If output is being truncated, fix the prompt — not the token limit.
- **Do not install npm packages without discussion.** The build toolchain (craco, polyfills) is fragile. New dependencies that use Node.js built-ins may break the browser build without obvious errors.
- **Do not modify shared components** (`AIChat`, `Header`, `SettingsDrawer`, `Sidebar`) to support one module's needs. If you need different behavior, create a local component inside your module folder.
- **Do not destructure values from `useApp()` that you don't use in the component body.** CI treats unused variables as errors.
- **Do not create files outside your module folder** during module development, except the single entry in `src/modules/index.js` and the optional summarizer in `src/utils/initiativeContext.js`.
- **Do not return freeform text from AI prompts.** Every `AI_SYSTEM_PROMPT` must instruct Claude to return JSON only, and the parsing step must use the `result.match(/\{[\s\S]*\}/)` pattern.
- **Do not omit `appPassword` or `onUsage` from `callClaude()` calls.** These are required for the passphrase gate and token budget tracking to work correctly in production.
- **Do not work directly on `main`.** Use a feature branch and open a PR.
