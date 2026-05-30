# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Clipboard Inspector is a single-page React app that shows what data is available
when you paste or drop something onto a web page. It renders the contents of the
clipboard / drag payload broken out by MIME type, with MDN documentation links for
every API surfaced. Live site is GitHub Pages (`evercoder.github.io/clipboard-inspector`).

## Commands

-   `npm install` — install deps (also runs `prepare`, which points git's hooks path at `.git-hooks`).
-   `npm run start` — esbuild dev server with live reload at http://127.0.0.1:8000.
-   `npm run build` — production bundle of `index.jsx` → `index.js`.
-   `npm run deploy` — build, then publish the directory to the `gh-pages` branch.

There is no test runner and no separate lint command. A pre-commit hook
(`.git-hooks/pre-commit`) runs `pretty-quick --staged`, so staged files are
auto-formatted with Prettier on commit (config lives in `package.json`: tabs,
single quotes, semicolons, no trailing commas, 80-col).

## Build model — edit `index.jsx`, not `index.js`

**`index.jsx` is the only source file. `index.js` is the esbuild bundle and is
auto-generated** (its banner says so). `index.html` loads `index.js` directly, so
any change to `index.jsx` only takes effect in the deployed/built site after
`npm run build` regenerates `index.js`. `index.js` is committed to the repo (it
must be present for GitHub Pages), so a source change is not complete until you
rebuild and commit the regenerated bundle alongside it. `npm run start` serves the
JSX live without this step, but `build`/`deploy` are what update the committed bundle.

## Architecture

Everything lives in `index.jsx` (~400 lines). Two pieces:

**`extractData(data)`** — the normalization layer. It accepts the three different
payload objects the browser hands you and flattens each into one uniform shape the
UI can render:

-   `DataTransfer` (from `paste` and `drop` events) → `{ type, types[], items[], files[] }`
-   `ClipboardItem` (from the async `navigator.clipboard.read()` API) → `{ type, types[] }`

For each MIME type it eagerly resolves the data to a string (or, for binary, a
`file_info` object carrying an `URL.createObjectURL` blob URL). Note: `image/svg+xml`
is deliberately resolved as **text** rather than a binary blob (`blob.text()`),
alongside `text/*` — SVG is more useful shown as source.

**`ClipboardInspector`** — the React component that renders the extracted data as
`.types` / `.items` / `.files` tables. `MDN_URLS` maps each payload type to the right
MDN doc links shown in the headings. Text types get a "Copy as plain text" button.

**Entry points** — all four converge on the single `render(data, label)` function,
which runs `extractData` and re-renders the component:

-   `render()` on load (empty → intro screen)
-   `document` `paste` listener → `e.clipboardData`
-   `document` `drop` listener → `e.dataTransfer`
-   the "Paste using the Clipboard API" button → `navigator.clipboard.read()`
