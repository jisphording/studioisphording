# Lessons ledger

This file is project-level and outlives any `plan/NN-<slug>/` directory. It records one-line
"what worked" lessons — the cross-session memory that plan deletion would otherwise throw
away.

Nothing here loads itself. A lesson reaches a model only when a plan opts in by listing
`checks/lessons.md` in a phase's `requiredReading`, and only the `approved` slice is ever
rendered, hard-capped by `skills/_lib/lessons.py`.

## Lifecycle

`candidate` → `approved` (or `rejected`). `/cleanup` harvests candidates at phase closure;
it never approves one. Promotion is a human act and must name its approver:

```sh
python3 skills/_lib/lessons.py --promote LS-01 --approver "<name>"
```

## Entry format

Each entry is a `### LS-nn — <headline>` block with the following bolded keys:

- **Lesson**: one line — what worked, stated so a cold session can act on it
- **Anchor**: the context it came from (repo-relative path, doc pointer, or plan slug)
- **Added**: ISO date the candidate was harvested
- **Approver**: the human who promoted it, or `null` while it is a candidate
- **Status**: `candidate` | `approved` | `rejected`

---

### LS-01 — Example lesson

**Lesson**: Replace a superseded note in place rather than appending a second version beside it.
**Anchor**: CLAUDE.md
**Added**: null
**Approver**: null
**Status**: candidate

### LS-02 — Derive Kirby smoke/test URLs from Kirby's own rules (folder…

**Lesson**: Derive Kirby smoke/test URLs from Kirby's own rules (folder num_slug split at first '_', default-language prefix) — or ask Kirby — never from raw content folder names.
**Anchor**: scripts/smoke.sh
**Added**: 2026-09-15
**Approver**: null
**Status**: candidate

### LS-03 — Kirby's config.<host>.php resolution keys on the literal request Host…

**Lesson**: Kirby's config.<host>.php resolution keys on the literal request Host string, so 'localhost' and '127.0.0.1' need separate config files even though they're the same machine — scripts/smoke.sh binds 127.0.0.1, npm run php uses localhost.
**Anchor**: app/site/config/config.127.0.0.1.php
**Added**: 2026-09-16
**Approver**: null
**Status**: candidate

(End of file)
