import { describe, expect, it, vi } from 'vitest'
import { TypedEventEmitter } from './typed-event-emitter'

interface TestEventMap {
  ping: CustomEvent<{ n: number }>
  pong: CustomEvent<{ n: number }>
}

class TestEmitter extends TypedEventEmitter<TestEventMap> {
  fire(n: number): void {
    this.emit('ping', { n })
    this.emit('pong', { n })
  }

  clear(): void {
    this._clearListeners()
  }
}

describe('typedEventEmitter', () => {
  describe('on/once/off basics', () => {
    it('on() receives dispatched events', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.on('ping', handler)

      emitter.fire(1)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].detail).toEqual({ n: 1 })
    })

    it('once() fires exactly one time', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.once('ping', handler)

      emitter.fire(1)
      emitter.fire(2)

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('off() removes a specific listener', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.on('ping', handler)
      emitter.off('ping', handler)

      emitter.fire(1)

      expect(handler).not.toHaveBeenCalled()
    })

    it('on() with an array of types subscribes to all of them', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.on(['ping', 'pong'], handler)

      emitter.fire(1)

      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('_clearListeners()', () => {
    it('removes listeners registered via on() so they no longer fire', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.on('ping', handler)

      emitter.clear()
      emitter.fire(1)

      expect(handler).not.toHaveBeenCalled()
    })

    it('removes listeners registered via addEventListener() directly', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.addEventListener('ping', handler)

      emitter.clear()
      emitter.fire(1)

      expect(handler).not.toHaveBeenCalled()
    })

    it('removes listeners registered via once() before they fire', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.once('ping', handler)

      emitter.clear()
      emitter.fire(1)

      expect(handler).not.toHaveBeenCalled()
    })

    it('clears listeners across multiple event types at once', () => {
      const emitter = new TestEmitter()
      const pingHandler = vi.fn()
      const pongHandler = vi.fn()
      emitter.on('ping', pingHandler)
      emitter.on('pong', pongHandler)

      emitter.clear()
      emitter.fire(1)

      expect(pingHandler).not.toHaveBeenCalled()
      expect(pongHandler).not.toHaveBeenCalled()
    })

    it('a listener not invoked after clear even if dispatchEvent is later restored (simulates dispose neuter)', () => {
      const emitter = new TestEmitter()
      const handler = vi.fn()
      emitter.on('ping', handler)

      emitter.clear()
      // Simulate a class that neuters dispatchEvent on dispose, then
      // (hypothetically) has it restored/bypassed — clear() must have
      // already dropped the closure so the listener still can't fire.
      const originalDispatch = EventTarget.prototype.dispatchEvent.bind(emitter)
      ;(emitter as unknown as { dispatchEvent: typeof originalDispatch }).dispatchEvent = originalDispatch

      emitter.fire(1)

      expect(handler).not.toHaveBeenCalled()
    })

    it('the instance can accept and fire new listeners after clear()', () => {
      const emitter = new TestEmitter()
      const staleHandler = vi.fn()
      emitter.on('ping', staleHandler)
      emitter.clear()

      const freshHandler = vi.fn()
      emitter.on('ping', freshHandler)
      emitter.fire(1)

      expect(staleHandler).not.toHaveBeenCalled()
      expect(freshHandler).toHaveBeenCalledTimes(1)
    })

    it('is idempotent — calling clear() twice does not throw', () => {
      const emitter = new TestEmitter()
      emitter.on('ping', vi.fn())

      expect(() => {
        emitter.clear()
        emitter.clear()
      }).not.toThrow()
    })
  })
})
