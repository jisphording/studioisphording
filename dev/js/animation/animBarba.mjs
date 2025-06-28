// ---------- ---------- ---------- ---------- ---------- //
// B A R B A:   S C R E E N   T R A N S I T I O N //
// ---------- ---------- ---------- ---------- ---------- //
//
// Barba.js is used for easier page transitions 
//

import { animGsap } from './animGsap.mjs'

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
            },
            async enter(data) {
                console.log('Barba: enter transition triggered', data.next.url.href);
                await prepareNewPage(ScrollTrigger);
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
        // Use multiple requestAnimationFrame to ensure DOM is painted
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    // Re-initialize animations for the new page
                    animGsap();
                    
                    // Restart video autoplay
                    restartVideos();
                    
                    // Force ScrollTrigger refresh
                    ScrollTrigger.refresh();
                    console.log('Barba: New page ready, resolving enter transition');
                    resolve();
                }, 100);
            });
        });
    });
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
    
    return gsap.to(loader, {
        duration: 1.8,
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
