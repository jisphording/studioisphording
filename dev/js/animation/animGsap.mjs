// ---------- ---------- ---------- ---------- ---------- //
// G S A P //
// ---------- ---------- ---------- ---------- ---------- //
//
// Collecting smaller animations that are realised with gsap throughout the site
//

export function animGsap() {

    gsap.registerPlugin( ScrollTrigger );

    // Connect Parallax Layers
    let parallaxBack = document.getElementsByClassName( 'parallax__layer--back' )[ 0 ]
    let parallaxTitle = document.getElementsByClassName( 'parallax__layer--title' )[ 0 ]
    let parallaxFront = document.getElementsByClassName( 'parallax__layer--base' )[ 0 ]
    let parallaxTrigger = document.getElementsByClassName( 'parallax' )[ 0 ]

    gsap.to( parallaxBack, 
    {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: 
        {
            trigger: parallaxTrigger,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
        }
    })

    gsap.to( parallaxTitle, 
    {
        scale: 1,
        ease: 'none',
        scrollTrigger: 
        {
            trigger: parallaxTrigger,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
        }
    })
}
  