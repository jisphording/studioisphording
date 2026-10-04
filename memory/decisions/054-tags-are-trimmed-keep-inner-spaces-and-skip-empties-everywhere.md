---
candidate-id: 04-backlog-hygiene-and-robustness:decision:05
kind: decisions
id: MEM-054
slug: tags-are-trimmed-keep-inner-spaces-and-skip-empties-everywhere
title: Tags are trimmed, keep inner spaces, and skip empties everywhere
status: accepted
supersedes:
origin: 04-backlog-hygiene-and-robustness/decisions/5
created: 2026-10-05
---

## Context / Forces

Two code paths rendered comma-separated tags differently: `create_tags()` stripped every space, turning "Brand Design" into "BrandDesign", while `app/site/snippets/tag-list.php` kept an untrimmed leading space — an accident of an earlier verbatim move. No live content used the article template that relied on the old helper, so unifying was low-risk.

Citation: `04-backlog-hygiene-and-robustness/decisions/5`

## Decision

There is one tag-rendering behaviour: split on commas, trim each tag, keep its inner spaces, and drop empty entries.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Strip all spaces (old `create_tags()`) | Mangles multi-word tags. |
| Keep raw split output (old tag-list) | Leaves leading spaces and empty tags from trailing commas. |

## Consequences

Multi-word tags render as written. Any new tag output should go through the shared path rather than re-splitting the field.
