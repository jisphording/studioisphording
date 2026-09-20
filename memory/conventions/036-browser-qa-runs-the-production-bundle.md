---
candidate-id: refactor-dev-js:convention:03
kind: conventions
id: MEM-036
slug: browser-qa-runs-the-production-bundle
title: Browser QA runs the production bundle — bind php -S on 0.0.0.0 and browse via the LAN address so the dev-only config overrides never load
status: accepted
supersedes:
origin: refactor-dev-js/conventions/3
created: 2026-09-21
---

Browser QA must exercise what ships, not the dev pipeline: build first (`npm run build`),
then serve with `cd app && php -S 0.0.0.0:<port> kirby/router.php` bound on 0.0.0.0 and
browse via the machine's LAN address (not localhost). That keeps the dev-only
`app/site/config/config.localhost.php` / `config.127.0.0.1.php` overrides — the ones that
inject `vite.server` — from loading, so the page loads the production bundle from
`app/assets/bundle` exactly as deployed.

Harvested from `refactor-dev-js/conventions/3`.
