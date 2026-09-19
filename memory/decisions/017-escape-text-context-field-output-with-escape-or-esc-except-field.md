---
candidate-id: refactor-app-site:decision:07
kind: decisions
id: MEM-017
slug: escape-text-context-field-output-with-escape-or-esc-except-field
title: Content-field output policy: escape text-context output by default; fields carrying HTML/markdown get kirbytextinline() or stay raw with a one-line justification comment.
status: accepted
supersedes:
origin: refactor-app-site/decisions/7
created: 2026-09-20
---

## Context / Forces

Content is flat-file and author-controlled with no Panel, so escaping is defence-in-depth (LOW risk) rather than a fix for an exposed XSS. Titles are the likely exception — `remove_br_tags()` exists precisely because titles carry `<br>` — so the policy had to be chosen per field after inspecting `app/content`.

## Decision

Content-field output policy: escape text-context output by default; fields carrying HTML/markdown get kirbytextinline() or stay raw with a one-line justification comment. Follow this rule for future work on `app/site`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Escaping every field unconditionally was rejected because it would break intentional HTML in titles and markdown fields; leaving everything raw was rejected because the OutputEscapingGuard test would have nothing to enforce. |

## Consequences

Templates/snippets escape text-context fields with `->escape()`/`esc()`; intentional raw output requires a `// raw: <reason>` comment and is enforced by `tests/php/OutputEscapingGuardTest.php`. When adding an echo of a content field, follow the same policy. (*Origin:* `refactor-app-site/decisions/07`)
