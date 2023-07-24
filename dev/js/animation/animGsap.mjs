// ---------- ---------- ---------- ---------- ---------- //
// G S A P //
// ---------- ---------- ---------- ---------- ---------- //
//
// Collecting smaller animations that are realised with gsap throughout the site
//

export function animGsap() {

    gsap.registerPlugin( ScrollTrigger );

    // PARALLAX HEADER IMG
    let parallaxBack = document.getElementsByClassName( 'parallax__layer--back' )[ 0 ]
    // PARALLAX FRONT
    let parallaxFront = document.getElementsByClassName( 'parallax__layer--base' )[ 0 ]
    // PARALLAX TRIGGER
    let parallaxTrigger = document.getElementsByClassName( 'parallax' )[ 0 ]

    gsap.to( parallaxBack, {
        yPercent: 200,
        ease: 'none',
        scrollTrigger: {
            trigger: parallaxTrigger,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
        }
    })
}
  