---
candidate-id: refactor-dev-js:decision:08
kind: decisions
id: MEM-033
slug: characterization-tests-first-then-seam-tests-per-phase
title: Characterization tests pin pre-refactor behaviour first; each phase keeps them green and adds tests for the seam it creates — only known bugs run RED→GREEN via it.fails
status: accepted
supersedes:
origin: refactor-dev-js/decisions/8
created: 2026-09-21
---

## Context / Forces

The refactor was explicitly no-behaviour-change: page transitions, both Three.js worlds and
the moodboard lightbox had to render identically before and after. For such a refactor,
tests written against the pre-refactor code are the only automated proof that behaviour did
not change — tests written afterwards would just pin the new implementation.

## Decision

Phase 1 wrote characterization tests pinning today's behaviour before any module moved.
Every later phase kept them green and added tests for the seam it created (worlds registry,
`finishBatch`, the split barba modules, the lightbox fix). The one sanctioned exception:
a test documenting a known bug asserts the *correct* behaviour under `it.fails`, and the
phase that fixes the bug flips it back to `it` — that is the only RED→GREEN in the suite.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Write the tests after the refactor | They would pin the new implementation and prove nothing about behaviour preservation. |
| Full TDD (RED→GREEN) for every phase | Most tests here must pass before AND after the change; only genuine bug fixes have a RED state to leave. |

## Consequences

Buys: automated proof of behaviour preservation per phase, and a suite that grows with
every new seam. The `it.fails` known-bug convention is documented in CLAUDE.md and enforced
by review — don't weaken assertions to get green.

Harvested from `refactor-dev-js/decisions/8`.
