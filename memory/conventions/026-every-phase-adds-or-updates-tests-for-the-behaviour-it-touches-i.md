---
candidate-id: refactor-app-site:convention:08
kind: conventions
id: MEM-026
slug: every-phase-adds-or-updates-tests-for-the-behaviour-it-touches-i
title: Every phase adds or updates tests for the behaviour it touches, in the same change. A test that pins behaviour a phase must preserve keeps its assertions unchanged across the refactor (only its call site may move); a phase may add assertions but must not weaken one to go green.
status: accepted
supersedes:
origin: refactor-app-site/conventions/8
created: 2026-09-20
---

Every phase adds or updates tests for the behaviour it touches, in the same change. A test that pins behaviour a phase must preserve keeps its assertions unchanged across the refactor (only its call site may move); a phase may add assertions but must not weaken one to go green.

(*Origin:* `refactor-app-site/conventions/08`)
