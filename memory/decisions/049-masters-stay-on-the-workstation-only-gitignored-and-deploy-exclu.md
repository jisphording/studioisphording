---
candidate-id: 03-media-compression-and-delivery:decision:11
kind: decisions
id: MEM-049
slug: masters-stay-on-the-workstation-only-gitignored-and-deploy-exclu
title: Masters stay on the workstation only, gitignored and deploy-excluded, backed up out-of-band. No Git LFS, no committing masters, no syncing them to production.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/11
created: 2026-10-03
---

## Context / Forces

Settled by the user on 2026-09-21. Masters are large and the pipeline output is reproducible from them.

Citation: `03-media-compression-and-delivery/decisions/11`

## Decision

Masters stay on the workstation: gitignored, deploy-excluded and backed up out of band. No Git LFS, no committed masters, no sync to production.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Git LFS | Rejected by the user. |
| Committing masters | Rejected by the user. |
| Syncing masters to production | Rejected by the user. |

## Consequences

A fresh clone cannot run the media pipeline without the master archive. The deploy ships derivatives only. Revisiting means choosing an archive home and a restore procedure.
