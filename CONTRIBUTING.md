# Contributing to OCM Nexus

## Adding a New Module

1. **Copy** `src/modules/_ModuleTemplate/` → `src/modules/YourModuleName/`
2. **Edit** `schema.js` — define your constants, `emptyRow()`, and AI prompts
3. **Edit** `InputForm.jsx` — customize the table columns for your data shape
4. **Edit** `AIAssist.jsx` — update field mappings in `handleExtract()`
5. **Edit** `index.jsx` — set the module title, description, and state variables
6. **Register** in `src/modules/index.js`:
   ```js
   import YourModule from './YourModuleName';
   // add to moduleRegistry array:
   { id: 'your-module-id', label: 'Your Module', icon: SomeIcon, component: YourModule, description: '...', status: 'active' }
   ```
7. **(Optional)** Add a summarizer in `src/utils/initiativeContext.js` so other modules' AI calls can reference your data

## Module Props Contract

Every module component receives:

| Prop | Type | Description |
|------|------|-------------|
| `data` | `object` | Persisted module data for this initiative |
| `setData` | `function` | Call with updated state to persist |
| `initiative` | `object` | Full initiative (read other modules' data) |
| `moduleId` | `string` | This module's registry ID |

## Key Files

| File | Purpose |
|------|---------|
| `src/modules/index.js` | Module registry — sidebar + routing |
| `src/utils/initiativeContext.js` | Cross-module AI context sharing |
| `src/components/AIChat.jsx` | Shared conversational refinement panel |
| `src/context/AppContext.jsx` | Global state, API key, localStorage |

## Running

```bash
npm install
npx craco start     # dev server on :3000
npx craco build     # production build
```

## Full Guide

See `OCM Nexus - Module Developer Guide.txt` in the project root for detailed instructions, styling reference, export patterns, and agent architecture notes.
