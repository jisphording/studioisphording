---
candidate-id: 03-media-compression-and-delivery:decision:04
kind: decisions
id: MEM-042
slug: install-bootstrap-ssimulacra2-on-this-machine-as-part-of-phase-4
title: Install/bootstrap ssimulacra2 on this machine as part of phase 4 (Homebrew jpeg-xl first, source build of cloudinary/ssimulacra2 as the fallback, binary kept in a gitignored tools dir), AND ship a calibrated per-codec fallback mapping used when the binary is absent.
status: accepted
supersedes:
origin: 03-media-compression-and-delivery/decisions/4
created: 2026-10-03
---

## Context / Forces

The user asked on 2026-09-21 for the scorer to be set up on this machine, with a fallback mapping. `ssimulacra2` is not on PATH and `npm ci` cannot provide it. Homebrew's `jpeg-xl` 0.12.0 may not ship the tool in its bottle, so a source build of the cloudinary ssimulacra2 repo is the fallback.

Citation: `03-media-compression-and-delivery/decisions/4`

## Decision

Bootstrap `ssimulacra2` locally: Homebrew first, source build second, with the binary kept in a gitignored `tools/` directory. Also ship a calibrated per-codec fallback table, used when the binary is absent.

## Alternatives

| Option | Why rejected |
| --- | --- |
| Require the scorer everywhere | A fresh clone or CI could not build at all. |
| Skip the scorer and map quality only | Gives up per-image fidelity targeting. |

## Consequences

The scorer and its cache stay workstation-only. Runs without the scorer say they used the calibration table, and tests mock the scorer. Revisiting means deciding whether non-workstation machines should ever run the pipeline.
