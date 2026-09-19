---
candidate-id: refactor-app-site:decision:05
kind: decisions
id: MEM-015
slug: move-remove-br-tags-and-create-tags-from-snippets-utils-php-into
title: Global PHP helpers live in a function_exists-guarded plugin (app/site/plugins/helpers), not in an included snippet.
status: accepted
supersedes:
origin: refactor-app-site/decisions/5
created: 2026-09-20
---

## Context / Forces

remove_br_tags() and create_tags() lived in the former snippet app/site/snippets/utils.php, which only worked because `header.php` happened to include it exactly once — a second include would fatal with 'Cannot redeclare'. Global helpers need load-once semantics.

## Decision

Global PHP helpers live in a function_exists-guarded plugin (app/site/plugins/helpers), not in an included snippet. Follow this rule for future work on `app/site`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Keeping the functions in the snippet was rejected as a latent fatal waiting on any second include; moving them into site-methods was rejected because a separate plugin keeps the helpers disjoint from the site-methods rewrite so both phases could run in parallel. |

## Consequences

Helpers are now defined in a plugin that loads once before templates. New global helper functions go there, guarded with `function_exists`; the utils.php snippet was removed. (*Origin:* `refactor-app-site/decisions/05`)
