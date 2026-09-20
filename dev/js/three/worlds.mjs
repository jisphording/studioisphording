// ---------- ---------- ---------- ---------- ---------- //
// W O R L D S //
// ---------- ---------- ---------- ---------- ---------- //
//
// Registry of the worlds the Experience can run, keyed by the name
// runExperience() is called with. Adding a world is one entry here.
//
//   World   - class constructed after its Resources exist
//   sources - the asset list handed to Resources
//   mode    - Resources loading mode: 'batch' | 'progressive'
//   name    - Resources' worldName

import { World as World_01 } from './projects/isphording-inneneinrichtung/World.mjs'
import World_01_Sources from './projects/isphording-inneneinrichtung/World_Sources.mjs'

import { World as World_02 } from './projects/moodboard/World.mjs'
import World_02_Sources from './projects/moodboard/World_Sources.mjs'

export const worlds = {
  World_01: { World: World_01, sources: World_01_Sources, mode: 'batch', name: 'isphording-inneneinrichtung' },
  World_02: { World: World_02, sources: World_02_Sources, mode: 'progressive', name: 'moodboard' }
}
