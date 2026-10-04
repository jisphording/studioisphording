// Deferred start for below-the-fold videos.
//
// The responsive-video snippet renders non-hero videos loading="lazy" with
// <source data-src> and no autoplay, so no browser fetches bytes up front. This
// module restores data-src -> src and starts playback when the video first nears
// the viewport. Without IntersectionObserver, or where the browser handles
// loading="lazy" on media natively, there is nothing to wait for and sources are
// restored immediately. Markup that still carries real src (older renders) is
// detached and deferred the same way on the observer path. Dependency-free; safe
// to call again after a Barba swap.

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
  const videos = Array.from(root.querySelectorAll(SELECTOR)).filter((v) => !('lazyVideo' in v.dataset))
  if (videos.length === 0) return null

  if (supportsNativeLazyMedia() || typeof IntersectionObserver === 'undefined') {
    videos.forEach((video) => {
      video.dataset.lazyVideo = ''
      if (video.querySelector('source[data-src]')) start(video)
    })
    return null
  }

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
