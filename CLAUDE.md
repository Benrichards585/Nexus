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

Every AI generation must return a defined JSON structure. No freeform text from the model. Define the JSON schema in `schema.js` before writing `AIAssist.jsx`. Parse with:

```js
const jsonMatch = result.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('Could not parse AI response');
const parsed = JSON.parse(jsonMatch[0]);
```

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
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  system: enhancePromptWithContext(AI_SYSTEM_PROMPT, initiative, moduleId),
  messages: [{ role: 'user', content: userMessage }],
  apiKey,
  proxyAvailable,
  appPassword: accessPassword,   // required — do not omit
  onUsage: recordUsage,          // required — do not omit
})
```

### Required `useApp()` destructure in every `AIAssist.jsx`

```js
const { apiKey, aiEnabled, proxyAvailable, accessPassword, recordUsage,
        canMakeAIRequest, passwordRequired, accessGranted } = useApp();
```

Every `AIAssist.jsx` must render three guard states before any AI UI: `!aiEnabled`, `passwordRequired && !accessGranted`, and `!canMakeAIRequest`. Copy these blocks verbatim from any existing module — do not invent new patterns.

## Export Branding

All PDF exports must use the Cognizant header pattern. Copy this block into any `ExportControls.jsx`:

```js
const pdf = new jsPDF('l', 'mm', 'a4');  // landscape; use 'p' for portrait
const pageWidth = pdf.internal.pageSize.getWidth();

// Navy header bar — use Cognizant brand navy (#000048), not the old Nexus navy (#1A1F36)
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

Examples: `feature/resistance-management`, `feature/communication-planner`. No contributor commits directly to `main`. Only Ben Richards merges to main.

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

- **Do not install npm packages without discussion.** The build toolchain (craco, polyfills) is fragile. New dependencies that use Node.js built-ins may break the browser build without obvious errors.
- **Do not modify shared components** (`AIChat`, `Header`, `SettingsDrawer`, `Sidebar`) to support one module's needs. If you need different behavior, create a local component inside your module folder.
- **Do not destructure values from `useApp()` that you don't use in the component body.** CI treats unused variables as errors.
- **Do not create files outside your module folder** during module development, except the single entry in `src/modules/index.js` and the optional summarizer in `src/utils/initiativeContext.js`.
- **Do not return freeform text from AI prompts.** Every `AI_SYSTEM_PROMPT` must instruct Claude to return JSON only, and the parsing step must use the `result.match(/\{[\s\S]*\}/)` pattern.
- **Do not omit `appPassword` or `onUsage` from `callClaude()` calls.** These are required for the passphrase gate and token budget tracking to work correctly in production.
- **Do not work directly on `main`.** Use a feature branch and open a PR.
