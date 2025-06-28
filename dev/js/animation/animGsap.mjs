// ---------- ---------- ---------- ---------- ---------- //
// G S A P //
// ---------- ---------- ---------- ---------- ---------- //
//
// Collecting smaller animations that are realised with gsap throughout the site
//

export function animGsap() {
    console.log('animGsap: Starting initialization...');

    // Access GSAP and ScrollTrigger from global window object (loaded via CDN)
    const gsapLib = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    // Ensure GSAP and ScrollTrigger are available
    if (typeof gsapLib === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.error('GSAP or ScrollTrigger not loaded yet, retrying...');
        setTimeout(() => animGsap(), 100);
        return;
    }

    gsapLib.registerPlugin(ScrollTrigger);

    // Connect Parallax Layers
    let parallaxBack = document.getElementsByClassName( 'parallax__layer--back' )[ 0 ]
    let parallaxTitle = document.getElementsByClassName( 'parallax__layer--title' )[ 0 ]
    let parallaxFront = document.getElementsByClassName( 'parallax__layer--base' )[ 0 ]
    let parallaxTrigger = document.getElementsByClassName( 'parallax' )[ 0 ]

    // Only proceed if elements exist
    if (!parallaxBack || !parallaxTitle || !parallaxFront || !parallaxTrigger) {
        console.log('animGsap: Parallax elements not found, skipping initialization');
        return;
    }

    console.log('animGsap: All elements found, setting up animations...');

    // IMPORTANT: Ensure scroll position is at top before setting up animations
    window.scrollTo(0, 0);
    
    // Wait for scroll reset to take effect and ensure DOM is stable
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Additional delay to ensure everything is properly positioned
            setTimeout(() => {
        // IMPORTANT: Set initial state to ensure elements start in correct position
        gsapLib.set(parallaxTitle, {
            yPercent: 0,
            opacity: 1,
            clearProps: "transform,opacity" // Clear any previous transforms
        });

        gsapLib.set(parallaxBack, {
            yPercent: 0,
            scale: 1,
            clearProps: "transform"
        });

        // Force ScrollTrigger to recalculate positions
        ScrollTrigger.refresh();

    // Parallax animation for background video
    gsapLib.to( parallaxBack, 
    {
        yPercent: 500,
        scale: 2,
        ease: 'none',
        scrollTrigger: 
        {
            trigger: parallaxTrigger,
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    })

        // Title parallax animation - only moves on scroll
        gsapLib.to( parallaxTitle, 
        {
            yPercent: 80,
            opacity: 0,
            ease: 'none',
            scrollTrigger: 
            {
                trigger: parallaxTrigger, // Use parallaxTrigger instead of parallaxTitle
                start: 'top top',
                end: 'bottom top',
                scrub: true,
                onRefresh: () => {
                    // Ensure title starts in correct position when ScrollTrigger refreshes
                    if (window.scrollY === 0) {
                        gsapLib.set(parallaxTitle, {
                            yPercent: 0,
                            opacity: 1
                        });
                    }
                }
            }
        });

                // Final refresh to ensure everything is properly positioned
                ScrollTrigger.refresh();
                
                console.log('animGsap: Initialization complete');
            }, 100); // Additional delay for stability
        });
    });
}
