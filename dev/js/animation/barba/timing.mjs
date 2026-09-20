// ---------- Transition timing (tunable in one place) ---------- //

// Ceiling for the readiness gate. The reveal never waits longer than this after
// the cover floor, even if an asset never finishes loading. A visibly
// incomplete page is better than a stuck loader.
export const READY_TIMEOUT_MS = 3000;

// Minimum time the cover stays closed, measured from the moment the wipe-in
// completes. Stops a warm cache from producing a jarring instant flash-open.
export const MIN_COVER_MS = 400;

// Duration of the reveal wipe. Now that the cover does real work (it holds until
// the incoming page is ready), the reveal no longer has to stall for content, so
// it is far shorter than the old 1.8s. With the 0.8s wipe-in and the 0.4s cover
// floor, this keeps the warm-cache transition at ~0.8 + 0.4 + 0.7 = 1.9s, under
// the ~2s target.
export const REVEAL_DURATION_S = 0.7;

// Duration of the reduced-motion cross-fade that replaces both wipes.
export const CROSSFADE_DURATION_S = 0.3;

/**
 * Whether the user has asked for reduced motion. Read live on each transition so
 * a mid-session change of the OS setting is honoured without a reload.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
