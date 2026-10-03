// Deferred start for below-the-fold videos.
//
// The responsive-video snippet marks non-hero videos loading="lazy". Where the
// browser honours that on media elements ('loading' in HTMLMediaElement.prototype)
// this module does nothing. Elsewhere (Safari today) it detaches each lazy
// video's sources and autoplay, then restores them when the video first nears
// the viewport. Dependency-free; safe to call again after a Barba swap.

const SELECTOR = 'video[loading="lazy"]'
const ROOT_MARGIN = '200px'

export const supportsNativeLazyMedia = () =>
  typeof HTMLMediaElement !== 'undefined' && 'loading' in HTMLMediaElement.prototype

const start = (video) => {
  video.querySelectorAll('source[data-src]').forEach((source) => {
    source.setAttribute('src', source.dataset.src)
    source.removeAttribute('data-src')
  })
  video.setAttribute('autoplay', '')
  video.load()
  const played = video.play()
  // Autoplay policy can still reject; the poster stays, which is fine.
  if (played && typeof played.catch === 'function') played.catch(() => {})
}

/**
 * @param {ParentNode} [root]
 * @returns {IntersectionObserver|null} the observer, or null when native
 *   support makes this a no-op (or there is nothing to defer)
 */
export default function lazyVideo(root = document) {
  if (supportsNativeLazyMedia() || typeof IntersectionObserver === 'undefined') return null

  const videos = Array.from(root.querySelectorAll(SELECTOR)).filter((v) => !('lazyVideo' in v.dataset))
  if (videos.length === 0) return null

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      observer.unobserve(entry.target)
      start(entry.target)
    })
  }, { rootMargin: ROOT_MARGIN })

  videos.forEach((video) => {
    video.dataset.lazyVideo = ''
    video.removeAttribute('autoplay')
    video.pause()
    video.querySelectorAll('source[src]').forEach((source) => {
      source.dataset.src = source.getAttribute('src')
      source.removeAttribute('src')
    })
    video.load()
    observer.observe(video)
  })

  return observer
}
