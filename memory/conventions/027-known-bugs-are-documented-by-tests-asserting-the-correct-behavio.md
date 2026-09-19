---
candidate-id: refactor-app-site:convention:09
kind: conventions
id: MEM-027
slug: known-bugs-are-documented-by-tests-asserting-the-correct-behavio
title: Known bugs are documented by tests asserting the CORRECT behaviour, tagged #[Group('known-bug')] and excluded from the default run in phpunit.xml.dist. The phase that fixes a bug removes the group attribute; app/vendor/bin/phpunit --group known-bug must then no longer list that test.
status: accepted
supersedes:
origin: refactor-app-site/conventions/9
created: 2026-09-20
---

Known bugs are documented by tests asserting the CORRECT behaviour, tagged #[Group('known-bug')] and excluded from the default run in phpunit.xml.dist. The phase that fixes a bug removes the group attribute; app/vendor/bin/phpunit --group known-bug must then no longer list that test.

(*Origin:* `refactor-app-site/conventions/09`)
