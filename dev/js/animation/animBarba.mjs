// ---------- ---------- ---------- ---------- ---------- //
// B A R B A:   S C R E E N   T R A N S I T I O N //
// ---------- ---------- ---------- ---------- ---------- //
//
// Barba.js is used for easier page transitions 
//

import { READY_TIMEOUT_MS, MIN_COVER_MS } from './barba/timing.mjs'
import { waitForPageReady } from './barba/readiness.mjs'
import { animateLoaderIn, animateLoaderOut } from './barba/loaderTween.mjs'
import {
    prepareNewPage,
    pinScrollToTop,
    assertSingleContainer,
    addTransitionClasses,
    removeTransitionClasses,
    resetPageElements,
    syncPageClass
} from './barba/pageState.mjs'

export { waitForPageReady }

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

                const releaseScrollPin = pinScrollToTop(ScrollTrigger);
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
                releaseScrollPin();
            }
        }]
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
    barba.hooks.enter((data) => {
        syncPageClass(data?.next?.html);
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
