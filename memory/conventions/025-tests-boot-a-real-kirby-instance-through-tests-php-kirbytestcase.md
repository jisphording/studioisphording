---
candidate-id: refactor-app-site:convention:07
kind: conventions
id: MEM-025
slug: tests-boot-a-real-kirby-instance-through-tests-php-kirbytestcase
title: Tests boot a real Kirby instance through tests/php/KirbyTestCase.php, with site pointing at app/site (real plugins, snippets, templates) and content/media/cache pointing at a per-test temp copy of tests/php/fixtures/. Tests never read or write app/content and need no running PHP server or network.
status: accepted
supersedes:
origin: refactor-app-site/conventions/7
created: 2026-09-20
---

Tests boot a real Kirby instance through tests/php/KirbyTestCase.php, with site pointing at app/site (real plugins, snippets, templates) and content/media/cache pointing at a per-test temp copy of tests/php/fixtures/. Tests never read or write app/content and need no running PHP server or network.

(*Origin:* `refactor-app-site/conventions/07`)
