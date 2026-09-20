import { prefersReducedMotion, REVEAL_DURATION_S, CROSSFADE_DURATION_S } from './timing.mjs'

/**
 * Animate the loading screen into view
 * @param {Object} gsap - GSAP instance
 * @param {HTMLElement} loader - Loading screen element
 * @returns {gsap.Timeline} GSAP timeline for the animation
 */
export function animateLoaderIn(gsap, loader) {
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
export function animateLoaderOut(gsap, loader) {
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
