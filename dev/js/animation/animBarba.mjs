// ---------- ---------- ---------- ---------- ---------- //
// B A R B A:   S C R E E N   T R A N S I T I O N //
// ---------- ---------- ---------- ---------- ---------- //
//
// Barba.js is used for easier page transitions 
//

import { animGsap } from './animGsap.mjs'

// ---------- Transition timing (tunable in one place) ---------- //

// Ceiling for the readiness gate. The reveal never waits longer than this after
// the cover floor, even if an asset never finishes loading. A visibly
// incomplete page is better than a stuck loader.
const READY_TIMEOUT_MS = 3000;

// Minimum time the cover stays closed, measured from the moment the wipe-in
// completes. Stops a warm cache from producing a jarring instant flash-open.
const MIN_COVER_MS = 400;

// Duration of the reveal wipe. Now that the cover does real work (it holds until
// the incoming page is ready), the reveal no longer has to stall for content, so
// it is far shorter than the old 1.8s. With the 0.8s wipe-in and the 0.4s cover
// floor, this keeps the warm-cache transition at ~0.8 + 0.4 + 0.7 = 1.9s, under
// the ~2s target.
const REVEAL_DURATION_S = 0.7;

// Duration of the reduced-motion cross-fade that replaces both wipes.
const CROSSFADE_DURATION_S = 0.3;

/**
 * Whether the user has asked for reduced motion. Read live on each transition so
 * a mid-session change of the OS setting is honoured without a reload.
 * @returns {boolean}
 */
function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

/**
 * Main function to initialize Barba.js page transitions with loading screen animations
 * Sets up smooth page transitions with GSAP-powered loading animations and proper cleanup
 */
export function animBarba() {
    console.log('animBarba: Starting initialization...');

    // Check if required libraries are available
    if (!checkLibraries()) {
        return;
    }

    // Get required elements and libraries
    const { barba, gsap, ScrollTrigger, loader } = getRequiredElements();
    
    if (!loader) {
        console.error('Loading screen element (.loadingScreen) not found in DOM');
        return;
    }

    // Initialize Barba with transitions
    initializeBarbaTransitions(barba, gsap, ScrollTrigger, loader);
    
    // Setup Barba hooks
    setupBarbaHooks(barba, ScrollTrigger);

    console.log('✅ Barba.js initialized successfully with loading screen animations');
}

/**
 * Check if all required libraries are loaded
 * @returns {boolean} True if all libraries are available
 */
function checkLibraries() {
    const barba = window.barba;
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    
    if (typeof barba === 'undefined' || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error('Barba, GSAP, or ScrollTrigger not loaded yet, retrying...');
        setTimeout(() => animBarba(), 100);
        return false;
    }
    
    return true;
}

/**
 * Get all required elements and libraries
 * @returns {Object} Object containing barba, gsap, ScrollTrigger, and loader
 */
function getRequiredElements() {
    return {
        barba: window.barba,
        gsap: window.gsap,
        ScrollTrigger: window.ScrollTrigger,
        loader: document.querySelector('.loadingScreen')
    };
}

/**
 * Initialize Barba transitions
 * @param {Object} barba - Barba instance
 * @param {Object} gsap - GSAP instance
 * @param {Object} ScrollTrigger - ScrollTrigger instance
 * @param {HTMLElement} loader - Loading screen element
 */
function initializeBarbaTransitions(barba, gsap, ScrollTrigger, loader) {
    barba.init({
        transitions: [{
            name: 'default-transition',
            async leave(data) {
                console.log('Barba: leave transition triggered', data.current.url.href);
                await animateLoaderIn(gsap, loader);

                // Take ownership of the swap: remove the outgoing container now,
                // while the loader fully covers the viewport. This is Barba's
                // documented container-ownership pattern; Barba's own later
                // removal becomes a no-op on this detached node. Without it the
                // reveal (animateLoaderOut) would uncover the page we just left.
                data.current.container.remove();
            },
            async enter(data) {
                console.log('Barba: enter transition triggered', data.next.url.href);

                // Start the minimum cover floor now: leave() already awaited the
                // wipe-in, so at this point the cover fully hides the viewport.
                // The floor guarantees the cover is up for at least MIN_COVER_MS
                // even when everything is already cached.
                const minCover = new Promise(resolve => setTimeout(resolve, MIN_COVER_MS));

                await prepareNewPage(ScrollTrigger);
                assertSingleContainer();

                // Hold the reveal until BOTH the incoming page is presentable
                // (bounded by READY_TIMEOUT_MS) and the cover floor has elapsed.
                // On a timeout, waitForPageReady still resolves, so the loader
                // always opens.
                await Promise.all([
                    waitForPageReady(data.next.container, { timeout: READY_TIMEOUT_MS }),
                    minCover
                ]);

                await animateLoaderOut(gsap, loader);
            }
        }]
    });
}

/**
 * Prepare the new page by initializing animations and resources
 * @param {Object} ScrollTrigger - ScrollTrigger instance
 * @returns {Promise} Promise that resolves when page is ready
 */
function prepareNewPage(ScrollTrigger) {
    return new Promise(resolve => {
        // Two requestAnimationFrame ticks let the browser paint the new
        // container before the wipe opens. (Phase 5 replaces this guesswork
        // with a real asset-readiness signal; no fixed setTimeout stands in
        // for one here.)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // The outgoing container was removed at the end of leave(), so
                // these all run against the new container only.
                animGsap();

                // Restart video autoplay
                restartVideos();

                // Force ScrollTrigger refresh
                ScrollTrigger.refresh();
                console.log('Barba: New page ready, resolving enter transition');
                resolve();
            });
        });
    });
}

/**
 * Warn loudly if the DOM does not hold exactly one Barba container before the
 * reveal. With the outgoing container removed at the end of leave() and the new
 * one appended by Barba, the count must be 1 for the whole animateLoaderOut
 * tween - anything else means the reveal can flash the page we just left.
 */
function assertSingleContainer() {
    const count = document.querySelectorAll('[data-barba="container"]').length;
    if (count !== 1) {
        console.warn(`Barba: expected exactly 1 container before the reveal, found ${count} - the outgoing page may flash during animateLoaderOut`);
    }
}

/**
 * Restart video autoplay for all video elements on the new page
 */
function restartVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(vid => { 
        const playPromise = vid.play();
        if (playPromise !== undefined) { 
            playPromise.catch(error => {
                console.log('Video autoplay prevented:', error);
            }); 
        } 
    });
}

/**
 * Animate the loading screen into view
 * @param {Object} gsap - GSAP instance
 * @param {HTMLElement} loader - Loading screen element
 * @returns {gsap.Timeline} GSAP timeline for the animation
 */
function animateLoaderIn(gsap, loader) {
    console.log('Barba: loaderIn animation starting');

    // Reduced motion: collapse the wipe to a short cross-fade. The readiness
    // gate still runs (it is correctness, not decoration).
    if (prefersReducedMotion()) {
        return gsap.timeline()
            .set(loader, {
                autoAlpha: 0,
                scaleX: 1,
                xPercent: 0,
                yPercent: -50,
                transformOrigin: 'center center'
            })
            .to(loader, {
                duration: CROSSFADE_DURATION_S,
                autoAlpha: 1,
                ease: 'power1.inOut',
                onComplete: () => {
                    console.log('Barba: loaderIn cross-fade complete');
                }
            });
    }

    return gsap.timeline()
        .set(loader, {
            autoAlpha: 1,
            scaleX: 0,
            xPercent: -5,
            yPercent: -50,
            transformOrigin: 'left center'
        })
        .to(loader, {
            duration: 0.8,
            xPercent: 0,
            scaleX: 1,
            ease: 'power4.inOut',
            onComplete: () => {
                console.log('Barba: loaderIn animation complete');
            }
        });
}

/**
 * Animate the loading screen out of view
 * @param {Object} gsap - GSAP instance
 * @param {HTMLElement} loader - Loading screen element
 * @returns {gsap.Timeline} GSAP timeline for the animation
 */
function animateLoaderOut(gsap, loader) {
    console.log('Barba: loaderAway animation starting');

    // Reduced motion: cross-fade the cover out instead of wiping it. Reset back
    // to the hidden wipe state afterwards so the next (possibly non-reduced)
    // transition starts from a known geometry.
    if (prefersReducedMotion()) {
        return gsap.to(loader, {
            duration: CROSSFADE_DURATION_S,
            autoAlpha: 0,
            ease: 'power1.inOut',
            onComplete: () => {
                console.log('Barba: loaderAway cross-fade complete');
                gsap.set(loader, {
                    autoAlpha: 0,
                    scaleX: 0,
                    xPercent: -5,
                    transformOrigin: 'left center'
                });
            }
        });
    }

    return gsap.to(loader, {
        duration: REVEAL_DURATION_S,
        scaleX: 0,
        xPercent: 5,
        transformOrigin: 'right center',
        ease: 'power4.inOut',
        onComplete: () => {
            console.log('Barba: loaderAway animation complete');
            // Reset the loading screen for next transition
            gsap.set(loader, {
                scaleX: 0,
                xPercent: -5,
                transformOrigin: 'left center'
            });
        }
    });
}

/**
 * Setup all Barba hooks for transition management
 * @param {Object} barba - Barba instance
 * @param {Object} ScrollTrigger - ScrollTrigger instance
 */
function setupBarbaHooks(barba, ScrollTrigger) {
    // Before transition starts
    barba.hooks.before((data) => {
        console.log('Barba: before hook - transition starting', {
            from: data.current.url.href,
            to: data.next.url.href
        });
        
        addTransitionClasses();
        ScrollTrigger.killAll();
    });

    // When entering new page
    barba.hooks.enter(() => {
        resetPageElements();
    });

    // After entering new page
    barba.hooks.afterEnter(() => {
        console.log('Barba: afterEnter hook - transition complete');
    });

    // After all transition processes complete
    barba.hooks.after(() => {
        removeTransitionClasses();
    });
}

/**
 * Add CSS classes during transition
 */
function addTransitionClasses() {
    document.querySelector('html').classList.add('is-transitioning');
    const wrapper = window.barba?.wrapper;
    if (wrapper) {
        wrapper.classList.add('is-animating');
    }
}

/**
 * Remove CSS classes after transition
 */
function removeTransitionClasses() {
    document.querySelector('html').classList.remove('is-transitioning');
    const wrapper = window.barba?.wrapper;
    if (wrapper) {
        wrapper.classList.remove('is-animating');
    }
}

/**
 * Reset page elements to their initial state
 */
function resetPageElements() {
    // Reset scroll position
    window.scrollTo(0, 0);
    
    // Reset showreel position
    const showreel = document.querySelector('.showreel');
    if (showreel) {
        showreel.style.top = '0%';
    }
    
    // Reset parallax elements
    resetParallaxElements();
}

/**
 * Reset parallax elements to their initial positions
 */
function resetParallaxElements() {
    const parallaxTitle = document.querySelector('.parallax__layer--title');
    if (parallaxTitle) {
        parallaxTitle.style.transform = '';
        parallaxTitle.style.opacity = '1';
    }
    
    const parallaxBack = document.querySelector('.parallax__layer--back');
    if (parallaxBack) {
        parallaxBack.style.transform = '';
    }
}
