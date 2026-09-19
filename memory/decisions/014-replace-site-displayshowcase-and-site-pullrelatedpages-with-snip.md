---
candidate-id: refactor-app-site:decision:04
kind: decisions
id: MEM-014
slug: replace-site-displayshowcase-and-site-pullrelatedpages-with-snip
title: Markup-emitting site methods become snippets: showcase-grid and related-grid take the parent page and limit as snippet data.
status: accepted
supersedes:
origin: refactor-app-site/decisions/4
created: 2026-09-20
---

## Context / Forces

`$site->displayShowcase()` and `$site->pullRelatedPages()` were siteMethods whose closures opened PHP mode and printed markup directly — markup in methods, against Kirby's idiom that methods return data and snippets own markup. A TODO in the source already asked for the two to be made consistent.

## Decision

Markup-emitting site methods become snippets: showcase-grid and related-grid take the parent page and limit as snippet data. Follow this rule for future work on `app/site`.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Keeping the markup in the methods (returning strings instead of printing) was rejected: it would have preserved the idiom violation while making the code harder to test than a snippet rendered against fixtures. |

## Consequences

Templates now `snippet()` the grids and pass data; site methods stay data-only. New grid markup belongs in snippets, not methods. (*Origin:* `refactor-app-site/decisions/04`)
