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

    // Access Barba, GSAP, and ScrollTrigger from global window object (loaded via CDN)
    const barba = window.barba;
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    
    // Ensure all libraries are available - retry if not loaded yet
    if (typeof barba === 'undefined' || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error('Barba, GSAP, or ScrollTrigger not loaded yet, retrying...');
        setTimeout(() => animBarba(), 100);
        return;
    }

    // Initialize Barba.js with default transition configuration
    barba.init({
        transitions: [{
            name: 'default-transition',
            // Function called when leaving the current page
            async leave(data) {
                console.log('Barba: leave transition triggered', data.current.url.href);
                await loaderIn();
            },
            // Function called when entering the new page
            async enter(data) {
                console.log('Barba: enter transition triggered', data.next.url.href);
                // Re-initialize animations for the new page first
                animGsap();
                // Then animate the loader away
                await loaderAway();
            }
        }]
    });

    console.log('✅ Barba.js initialized successfully with loading screen animations');

    // Get reference to the loading screen element
    const loader = document.querySelector('.loadingScreen');
    
    if (!loader) {
        console.error('Loading screen element (.loadingScreen) not found in DOM');
        return;
    }

    // Set initial state of loading screen for transitions
    // Note: CSS handles initial page load, GSAP handles transitions
    gsap.set( loader, 
    {
        scaleX: 0,
        xPercent: -5,
        yPercent: -50,
        transformOrigin: 'left center',
        // Don't set autoAlpha here - let CSS handle initial visibility
        // autoAlpha will be controlled during transitions
    });

    /**
     * Animates the loading screen into view during page transition
     * Creates a smooth scaling animation from left to right across the screen
     * @returns {gsap.Timeline} GSAP timeline for the animation
     */
    function loaderIn() {
        console.log('Barba: loaderIn animation starting');
        
        // Ensure the loading screen is visible and ready for animation
        gsap.set(loader, {
            autoAlpha: 1, // Make sure it's visible for the animation
            scaleX: 0,
            xPercent: -5,
            transformOrigin: 'left center'
        });
        
        // GSAP tween to stretch the loading screen across the whole screen
        return gsap.timeline()
            .to( loader,
            {
                duration: 0.8,
                xPercent: 0,
                scaleX: 1,
                ease: 'power4.inOut',
                transformOrigin: 'left center',
                onComplete: () => {
                    console.log('Barba: loaderIn animation complete');
                }
            });
    }

    /**
     * Animates the loading screen out of view after page transition
     * Creates a smooth scaling animation that hides the loader from right to left
     * @returns {gsap.Timeline} GSAP timeline for the animation
     */
    function loaderAway() {
        console.log('Barba: loaderAway animation starting');
        
        // GSAP tween to hide loading screen
        return gsap.to( loader,
        {
            duration: 0.8,
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


    // BARBA TRANSITION HOOKS
    /**
     * Hook executed before any transition starts
     * Adds CSS classes for styling, cleans up resources, and kills ScrollTriggers
     */
    barba.hooks.before((data) => {
        console.log('Barba: before hook - transition starting', {
            from: data.current.url.href,
            to: data.next.url.href
        });
        
        document.querySelector('html').classList.add('is-transitioning');
        if (barba.wrapper) {
            barba.wrapper.classList.add('is-animating');
        }
        
        
        // Kill all GSAP ScrollTriggers
        ScrollTrigger.killAll();
    });

    /**
     * Hook executed when entering a new page
     * Resets scroll position and element positions to ensure clean page state
     */
    barba.hooks.enter(() => {
        // Reset scroll position immediately
        window.scrollTo(0, 0);
        
        // Reset showreel and title positions if they exist
        const showreel = document.querySelector('.showreel');
        if (showreel) {
            showreel.style.top = '0%';
        }
        
        // Reset parallax elements to initial position
        const parallaxTitle = document.querySelector('.parallax__layer--title');
        if (parallaxTitle) {
            // Clear any transforms and ensure it starts in correct position
            parallaxTitle.style.transform = '';
            parallaxTitle.style.opacity = '1';
        }
        
        const parallaxBack = document.querySelector('.parallax__layer--back');
        if (parallaxBack) {
            parallaxBack.style.transform = '';
        }
    });

    /**
     * Hook executed after entering a new page and DOM is ready
     * Handles reinitialization of page resources including videos and ScrollTrigger
     * Uses multiple requestAnimationFrame calls and timeouts to ensure proper timing
     */
    barba.hooks.afterEnter(() => {
        console.log('Barba: afterEnter hook - preparing new page');
        
        // Ensure scroll is still at top
        window.scrollTo(0, 0);
        
        // Use requestAnimationFrame to ensure DOM is painted and scroll reset is applied
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Wait a bit more to ensure all elements are properly loaded and positioned
                setTimeout(() => {
                    console.log('Barba: Reinitializing page resources...');
                    // Restart video autoplay for all video elements on the new page
                    const videos = document.querySelectorAll('video');
                    videos.forEach(vid => { 
                        const playPromise = vid.play();
                        if (playPromise !== undefined) { 
                            playPromise
                                .then(() => {
                                    // Video started playing successfully
                                })
                                .catch(error => {
                                    // Auto-play was prevented
                                    console.log('Video autoplay prevented:', error);
                                }); 
                        } 
                    });

                    
                    // Force a final ScrollTrigger refresh after everything is set up
                    setTimeout(() => {
                        ScrollTrigger.refresh();
                        console.log('Barba: Page transition complete, ScrollTrigger refreshed');
                    }, 100); // Increased delay for better stability
                }, 200); // Increased delay to ensure everything is ready
            });
        });
    });

    /**
     * Hook executed after all transition processes are complete
     * Removes CSS classes that were added during transition for clean final state
     */
    barba.hooks.after(() => {
        document.querySelector('html').classList.remove('is-transitioning');
        if (barba.wrapper) {
            barba.wrapper.classList.remove('is-animating');
        }
    });
}
