import { READY_TIMEOUT_MS } from './timing.mjs'

/**
 * Wait until the incoming container is presentable, then resolve.
 *
 * Races the readiness signals (fonts, visible images, autoplay video) against a
 * single timeout. It ALWAYS resolves - never rejects, never hangs - so a slow or
 * broken asset can only ever delay the reveal up to the timeout, never block it.
 * Every listener is attached with { once: true } and removed in a finally, so a
 * timed-out navigation cannot leak listeners onto a detached container.
 *
 * @param {HTMLElement} container - the incoming Barba container
 * @param {Object} [opts]
 * @param {number} [opts.timeout=READY_TIMEOUT_MS] - ceiling in ms
 * @returns {Promise<void>}
 */
export function waitForPageReady(container, { timeout = READY_TIMEOUT_MS } = {}) {
    const cleanups = [];
    const ready = Promise.all(collectReadinessSignals(container, cleanups));

    let timer;
    const ceiling = new Promise(resolve => {
        timer = setTimeout(resolve, timeout);
    });

    return Promise.race([ready, ceiling])
        .catch(() => {}) // defensive: the gate must never reject
        .finally(() => {
            clearTimeout(timer);
            cleanups.forEach(fn => {
                try { fn(); } catch (_) { /* detached node */ }
            });
        });
}

/**
 * Collect the readiness signals for a container. Each signal is a Promise that
 * only ever resolves (failures are caught to a no-op), so Promise.all over them
 * cannot reject. Any event listeners registered here push their teardown onto
 * `cleanups` so waitForPageReady can clear them after a timeout.
 * @param {HTMLElement} container
 * @param {Function[]} cleanups
 * @returns {Promise<*>[]}
 */
function collectReadinessSignals(container, cleanups) {
    const signals = [];

    // (a) Web fonts applied. document.fonts.ready resolves once all pending
    // font loads settle; guard for browsers without the Font Loading API.
    if (document.fonts && document.fonts.ready) {
        signals.push(Promise.resolve(document.fonts.ready).catch(() => {}));
    }

    // (b) Every <img> that intersects the initial viewport. Off-screen images
    // are not worth holding the cover for.
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    container.querySelectorAll('img').forEach(img => {
        const rect = img.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < vh &&
            rect.right > 0 && rect.left < vw;
        if (!inView || img.complete) return;
        // decode() waits for the bytes and the decode; catch so a 404 image
        // cannot reject the gate.
        const decoded = img.decode ? img.decode() : Promise.resolve();
        signals.push(Promise.resolve(decoded).catch(() => {}));
    });

    // (c) Every autoplaying <video>. readyState >= 2 (HAVE_CURRENT_DATA) means
    // the first frame is available; otherwise wait for canplay/loadeddata.
    container.querySelectorAll('video[autoplay]').forEach(video => {
        if (video.readyState >= 2) return;
        signals.push(new Promise(resolve => {
            const onReady = () => resolve();
            video.addEventListener('canplay', onReady, { once: true });
            video.addEventListener('loadeddata', onReady, { once: true });
            cleanups.push(() => {
                video.removeEventListener('canplay', onReady);
                video.removeEventListener('loadeddata', onReady);
            });
        }));
    });

    return signals;
}
