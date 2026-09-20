// Characterization tests for dev/js/three/utils/EventEmitter.mjs.
//
// They pin the emitter's behaviour, including callback-specific off() and
// trigger()'s return value.
//
// Pure logic — no DOM, no timers except the explicit fake-timer case.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import EventEmitter from '../../../../dev/js/three/utils/EventEmitter.mjs'

describe('EventEmitter', () => {
  let emitter

  beforeEach(() => {
    emitter = new EventEmitter()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('on / trigger', () => {
    it('calls a registered callback with a single argument', () => {
      const cb = vi.fn()
      emitter.on('tick', cb)

      emitter.trigger('tick', 42)

      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb).toHaveBeenCalledWith(42)
    })

    it('spreads an array argument across the callback parameters', () => {
      const cb = vi.fn()
      emitter.on('resize', cb)

      emitter.trigger('resize', [1024, 768])

      expect(cb).toHaveBeenCalledWith(1024, 768)
    })

    it('calls every callback registered for the same name, in registration order', () => {
      const order = []
      emitter.on('tick', () => order.push('first'))
      emitter.on('tick', () => order.push('second'))

      emitter.trigger('tick')

      expect(order).toEqual(['first', 'second'])
    })

    it('returns this from on() for chaining', () => {
      expect(emitter.on('tick', () => {})).toBe(emitter)
    })

    it('warns and returns false for a missing name or callback', () => {
      expect(emitter.on('', () => {})).toBe(false)
      expect(emitter.on('tick')).toBe(false)
      expect(console.warn).toHaveBeenCalledTimes(2)
    })

    it('warns and returns false when triggering an empty name', () => {
      expect(emitter.trigger('')).toBe(false)
      expect(console.warn).toHaveBeenCalledWith('wrong name')
    })

    it('ignores a trigger for a name nobody listens to', () => {
      expect(() => emitter.trigger('nobody-home')).not.toThrow()
    })
  })

  describe('multi-name registration', () => {
    it('registers one callback for comma-, space- and slash-separated names', () => {
      const cb = vi.fn()
      emitter.on('alpha,bravo charlie/delta', cb)

      emitter.trigger('alpha')
      emitter.trigger('bravo')
      emitter.trigger('charlie')
      emitter.trigger('delta')

      expect(cb).toHaveBeenCalledTimes(4)
    })
  })

  describe('namespaces', () => {
    it('triggers a namespaced listener via its bare name', () => {
      const cb = vi.fn()
      emitter.on('tick.world', cb)

      emitter.trigger('tick')

      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('triggers only the addressed namespace when the name carries one', () => {
      const world = vi.fn()
      const hud = vi.fn()
      emitter.on('tick.world', world)
      emitter.on('tick.hud', hud)

      emitter.trigger('tick.world')

      expect(world).toHaveBeenCalledTimes(1)
      expect(hud).not.toHaveBeenCalled()
    })

    it('stores a namespaced listener under that namespace, not base', () => {
      emitter.on('tick.world', () => {})

      expect(emitter.callbacks.world.tick).toHaveLength(1)
      expect(emitter.callbacks.base.tick).toBeUndefined()
    })

    it('warns and returns this when triggering a bare namespace', () => {
      emitter.on('tick.world', () => {})

      expect(emitter.trigger('.world')).toBe(emitter)
      expect(console.warn).toHaveBeenCalledWith('wrong name')
    })
  })

  describe('off', () => {
    it('removes listeners for a name across every namespace', () => {
      const world = vi.fn()
      const hud = vi.fn()
      const base = vi.fn()
      emitter.on('tick.world', world)
      emitter.on('tick.hud', hud)
      emitter.on('tick', base)

      emitter.off('tick')
      emitter.trigger('tick')

      expect(world).not.toHaveBeenCalled()
      expect(hud).not.toHaveBeenCalled()
      expect(base).not.toHaveBeenCalled()
    })

    it('leaves other names in a namespace alone', () => {
      const tick = vi.fn()
      const resize = vi.fn()
      emitter.on('tick.world', tick)
      emitter.on('resize.world', resize)

      emitter.off('tick')
      emitter.trigger('resize')

      expect(tick).not.toHaveBeenCalled()
      expect(resize).toHaveBeenCalledTimes(1)
    })

    it('removes a whole namespace when given ".ns"', () => {
      const world = vi.fn()
      const hud = vi.fn()
      emitter.on('tick.world', world)
      emitter.on('resize.world', world)
      emitter.on('tick.hud', hud)

      emitter.off('.world')

      expect(emitter.callbacks.world).toBeUndefined()
      emitter.trigger('tick')
      expect(world).not.toHaveBeenCalled()
      expect(hud).toHaveBeenCalledTimes(1)
    })

    it('drops a namespace once its last name is removed', () => {
      emitter.on('tick.world', () => {})

      emitter.off('tick')

      expect(emitter.callbacks.world).toBeUndefined()
    })

    it('warns and returns false for a missing name', () => {
      expect(emitter.off('')).toBe(false)
      expect(console.warn).toHaveBeenCalledWith('wrong name')
    })

    it('off(name, callback) removes only that callback', () => {
      const keep = vi.fn()
      const drop = vi.fn()
      emitter.on('batchProcessed', keep)
      emitter.on('batchProcessed', drop)

      emitter.off('batchProcessed', drop)
      emitter.trigger('batchProcessed')

      expect(drop).not.toHaveBeenCalled()
      expect(keep).toHaveBeenCalledTimes(1)
    })

    it('off(name, callback) prunes the empty name and namespace', () => {
      const cb = vi.fn()
      emitter.on('batchProcessed.loader', cb)

      emitter.off('batchProcessed.loader', cb)

      expect(emitter.callbacks.loader).toBeUndefined()
      emitter.trigger('batchProcessed')
      expect(cb).not.toHaveBeenCalled()
    })

    it('off(name, callback) keeps the namespace while other names remain', () => {
      const cb = vi.fn()
      emitter.on('batchProcessed.loader', cb)
      emitter.on('resize.loader', () => {})

      emitter.off('batchProcessed.loader', cb)

      expect(emitter.callbacks.loader.batchProcessed).toBeUndefined()
      expect(emitter.callbacks.loader.resize).toHaveLength(1)
    })

    it('off(name, unknownCallback) is a no-op', () => {
      const cb = vi.fn()
      emitter.on('tick', cb)

      emitter.off('tick', () => {})
      emitter.trigger('tick')

      expect(cb).toHaveBeenCalledTimes(1)
      expect(emitter.callbacks.base.tick).toHaveLength(1)
    })

    it('off(name) without a callback still clears every listener', () => {
      const a = vi.fn()
      const b = vi.fn()
      emitter.on('tick', a)
      emitter.on('tick', b)

      emitter.off('tick')
      emitter.trigger('tick')

      expect(a).not.toHaveBeenCalled()
      expect(b).not.toHaveBeenCalled()
    })

    it('supports the Resources handshake: remove with callback, re-register, fires once per trigger', () => {
      const fired = vi.fn()
      const register = () => {
        const onProcessed = () => {
          fired()
          emitter.off('batchProcessed', onProcessed)
          register()
        }
        emitter.on('batchProcessed', onProcessed)
      }
      register()

      emitter.trigger('batchProcessed')
      expect(fired).toHaveBeenCalledTimes(1)

      emitter.trigger('batchProcessed')
      expect(fired).toHaveBeenCalledTimes(2)
    })

    it('a callback removing itself mid-trigger does not skip its siblings', () => {
      const sibling = vi.fn()
      const self = () => emitter.off('tick', self)
      emitter.on('tick', self)
      emitter.on('tick', sibling)

      emitter.trigger('tick')

      expect(sibling).toHaveBeenCalledTimes(1)
    })
  })

  describe('trigger return value', () => {
    it('returns the first callback result', () => {
      emitter.on('compute', () => 'first')
      emitter.on('compute', () => 'second')

      expect(emitter.trigger('compute')).toBe('first')
    })

    it('returns the first result even when it is undefined', () => {
      emitter.on('compute', () => undefined)
      emitter.on('compute', () => 'second')

      expect(emitter.trigger('compute')).toBeUndefined()
    })

    it('returns null when nothing listens', () => {
      expect(emitter.trigger('nobody-home')).toBeNull()
    })

    it('returns the first result of a namespaced trigger', () => {
      emitter.on('compute.world', () => 'world')

      expect(emitter.trigger('compute.world')).toBe('world')
    })
  })

  describe('registerBatchProcessor', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('runs processor then onComplete with the processor result', () => {
      const order = []
      const processor = vi.fn(data => {
        order.push('processor')
        return `processed:${data}`
      })
      const onComplete = vi.fn(() => order.push('onComplete'))

      emitter.registerBatchProcessor('batchLoaded', { processor, onComplete })
      emitter.trigger('batchLoaded', 'payload')

      expect(processor).toHaveBeenCalledWith('payload')
      expect(onComplete).toHaveBeenCalledWith('processed:payload')
      expect(order).toEqual(['processor', 'onComplete'])
    })

    it('fires completeEvent only after the configured delay', () => {
      const done = vi.fn()
      emitter.on('batchProcessed', done)
      emitter.registerBatchProcessor('batchLoaded', {
        processor: () => 'result',
        delay: 200,
        completeEvent: 'batchProcessed'
      })

      emitter.trigger('batchLoaded', 'payload')
      expect(done).not.toHaveBeenCalled()

      vi.advanceTimersByTime(199)
      expect(done).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(done).toHaveBeenCalledTimes(1)
      expect(done).toHaveBeenCalledWith('result')
    })

    it('defaults the delay to 200ms', () => {
      const done = vi.fn()
      emitter.on('batchProcessed', done)
      emitter.registerBatchProcessor('batchLoaded', {
        processor: () => 'result',
        completeEvent: 'batchProcessed'
      })

      emitter.trigger('batchLoaded')
      vi.advanceTimersByTime(199)
      expect(done).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(done).toHaveBeenCalledTimes(1)
    })

    it('fires no completion event when completeEvent is omitted', () => {
      const processor = vi.fn(() => 'result')
      emitter.registerBatchProcessor('batchLoaded', { processor })

      emitter.trigger('batchLoaded')
      vi.advanceTimersByTime(5000)

      expect(processor).toHaveBeenCalledTimes(1)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('returns this for chaining', () => {
      expect(
        emitter.registerBatchProcessor('batchLoaded', { processor: () => {} })
      ).toBe(emitter)
    })
  })
})
