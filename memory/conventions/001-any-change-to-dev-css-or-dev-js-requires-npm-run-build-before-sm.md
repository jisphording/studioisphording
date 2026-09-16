---
candidate-id: 02-frontend-fidelity-and-deploy-safety:convention:02
kind: conventions
id: MEM-001
slug: any-change-to-dev-css-or-dev-js-requires-npm-run-build-before-sm
title: Any change to dev/css or dev/js requires npm run build before smoke, because app/assets/bundle is the only thing app/site/snippets/header.php loads in production mode.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/conventions/2
created: 2026-09-16
---

Editing anything under `dev/css` or `dev/js` has no effect on `bash scripts/smoke.sh`
results until `npm run build` runs first: `app/site/snippets/header.php` loads the compiled
bundle from `app/assets/bundle` in production mode, not the `dev/` sources directly (the
Vite dev server with HMR is a separate path used only via `npm run dev`). Skipping the
build step before running smoke silently tests stale assets and can pass green on code that
doesn't actually work.

`02-frontend-fidelity-and-deploy-safety/conventions/2`
