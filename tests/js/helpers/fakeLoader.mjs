// Fake Three.js loader.
//
// Stands in for THREE.TextureLoader / GLTFLoader / CubeTextureLoader so tests
// never touch the network. It records every load() call and settles each one on
// demand, which is what makes the Resources batch handshake observable:
//
//   const loader = new FakeLoader()
//   resources.loaders.textureLoader = loader
//   resources.start({ initialBatchSize: 2 })
//   loader.paths                       // ['/a.jpg', '/b.jpg']
//   loader.resolve('/a.jpg')           // fires onLoad with a fake texture
//   loader.reject('/b.jpg', new Error) // fires onError
//
// resolve() with no value hands the callback a fresh fake texture (an object
// with a writable `needsUpdate`), so `texture.needsUpdate = true` in production
// code is observable in assertions.

export function makeFakeTexture(path) {
  return { __fakeTexture: true, path, needsUpdate: false }
}

export class FakeLoader {
  constructor() {
    // One entry per load() call, in call order.
    this.calls = []
  }

  load(path, onLoad, onProgress, onError) {
    this.calls.push({ path, onLoad, onProgress, onError, settled: false })
  }

  /** Paths passed to load(), in call order (duplicates kept). */
  get paths() {
    return this.calls.map(call => call.path)
  }

  /** Number of load() calls made so far. */
  get callCount() {
    return this.calls.length
  }

  _take(path) {
    const call = this.calls.find(c => c.path === path && !c.settled)
    if (!call) {
      throw new Error(`FakeLoader: no pending load for path "${path}" (pending: ${
        this.calls.filter(c => !c.settled).map(c => c.path).join(', ') || 'none'
      })`)
    }
    call.settled = true
    return call
  }

  /** Settle one pending load successfully. Returns the value handed to onLoad. */
  resolve(path, value) {
    const call = this._take(path)
    const payload = value === undefined ? makeFakeTexture(path) : value
    call.onLoad(payload)
    return payload
  }

  /** Settle one pending load with an error. */
  reject(path, err = new Error(`FakeLoader: failed ${path}`)) {
    const call = this._take(path)
    if (typeof call.onError !== 'function') {
      throw new Error(`FakeLoader: load("${path}") was registered without an onError callback`)
    }
    call.onError(err)
    return err
  }

  /** Settle every pending load successfully, in call order. */
  resolveAll() {
    this.calls.filter(c => !c.settled).map(c => c.path).forEach(path => this.resolve(path))
  }
}
