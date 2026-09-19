---
candidate-id: refactor-app-site:convention:06
kind: conventions
id: MEM-024
slug: tests-live-in-tests-php-mirroring-the-app-site-path-of-the-unit
title: Tests live in tests/php/, mirroring the app/site path of the unit under test (e.g. tests/php/plugins/SiteMethodsTest.php, tests/php/snippets/ShowcaseGridTest.php). Never put tests, fixtures or phpunit config under app/ - scripts/deploy.sh mirrors app/ to the server.
status: accepted
supersedes:
origin: refactor-app-site/conventions/6
created: 2026-09-20
---

Tests live in tests/php/, mirroring the app/site path of the unit under test (e.g. tests/php/plugins/SiteMethodsTest.php, tests/php/snippets/ShowcaseGridTest.php). Never put tests, fixtures or phpunit config under app/ - scripts/deploy.sh mirrors app/ to the server.

(*Origin:* `refactor-app-site/conventions/06`)
