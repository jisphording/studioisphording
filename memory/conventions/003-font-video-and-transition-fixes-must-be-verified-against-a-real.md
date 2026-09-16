---
candidate-id: 02-frontend-fidelity-and-deploy-safety:convention:05
kind: conventions
id: MEM-003
slug: font-video-and-transition-fixes-must-be-verified-against-a-real
title: Font, video and transition fixes must be verified against a real browser (chrome-devtools MCP) in addition to smoke, because smoke only asserts HTTP 200 and clean markup.
status: accepted
supersedes:
origin: 02-frontend-fidelity-and-deploy-safety/conventions/5
created: 2026-09-16
---

`bash scripts/smoke.sh` only asserts that assets return HTTP 200 and that markup is clean
(e.g. no hand-built `/content/` paths) — it cannot tell whether a webfont actually renders,
a video actually plays, or a page transition actually reveals the right content. Every fix
in this plan touching fonts, video, or the Barba.js transition was additionally verified
live in a real browser (via the chrome-devtools MCP tool) before being considered done,
because these are exactly the classes of bug (all three defects this plan repaired) that a
green smoke run can miss entirely.

`02-frontend-fidelity-and-deploy-safety/conventions/5`
