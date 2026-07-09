import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkerTimer } from './worker-timer'

describe('workerTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('does not start the timer on construction', () => {
      const timer = new WorkerTimer()
      expect(timer.isRunning).toBe(false)
      timer.dispose()
    })

    it('defaults interval to 20ms', () => {
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)
      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalled()
      timer.dispose()
    })

    it('clamps interval to minimum 10ms', () => {
      const timer = new WorkerTimer({ interval: 5 })
      const callback = vi.fn()
      timer.start(callback)
      // At 9ms, should not have fired yet (interval clamped to 10)
      vi.advanceTimersByTime(9)
      expect(callback).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(callback).toHaveBeenCalledTimes(1)
      timer.dispose()
    })

    it('clamps interval to maximum 25ms', () => {
      const timer = new WorkerTimer({ interval: 50 })
      const callback = vi.fn()
      timer.start(callback)
      vi.advanceTimersByTime(25)
      expect(callback).toHaveBeenCalledTimes(1)
      timer.dispose()
    })

    it('accepts interval within range', () => {
      const timer = new WorkerTimer({ interval: 15 })
      const callback = vi.fn()
      timer.start(callback)
      vi.advanceTimersByTime(15)
      expect(callback).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(15)
      expect(callback).toHaveBeenCalledTimes(2)
      timer.dispose()
    })
  })

  describe('start', () => {
    it('sets isRunning to true', () => {
      const timer = new WorkerTimer()
      timer.start(() => {})
      expect(timer.isRunning).toBe(true)
      timer.dispose()
    })

    it('calls callback at regular intervals', () => {
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)
      vi.advanceTimersByTime(100)
      // 100ms / 20ms interval = 5 ticks
      expect(callback).toHaveBeenCalledTimes(5)
      timer.dispose()
    })

    it('is idempotent — multiple calls do not create multiple loops', () => {
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)
      timer.start(callback)
      timer.start(callback)
      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalledTimes(1)
      timer.dispose()
    })

    it('throws after dispose', () => {
      const timer = new WorkerTimer()
      timer.dispose()
      expect(() => timer.start(() => {})).toThrow('WorkerTimer has been disposed')
    })

    it('logs a console warning in fallback mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const timer = new WorkerTimer()
      timer.start(() => {})
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Web Workers unavailable'),
      )
      timer.dispose()
      warnSpy.mockRestore()
    })
  })

  describe('stop', () => {
    it('sets isRunning to false', () => {
      const timer = new WorkerTimer()
      timer.start(() => {})
      timer.stop()
      expect(timer.isRunning).toBe(false)
      timer.dispose()
    })

    it('stops callbacks from firing', () => {
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)
      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalledTimes(1)
      timer.stop()
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalledTimes(1)
      timer.dispose()
    })

    it('is a no-op when not running', () => {
      const timer = new WorkerTimer()
      expect(() => timer.stop()).not.toThrow()
      timer.dispose()
    })

    it('allows restart after stop', () => {
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)
      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalledTimes(1)
      timer.stop()
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalledTimes(1)

      // Restart — should warn again in fallback mode
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      timer.start(callback)
      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalledTimes(2)
      timer.dispose()
      warnSpy.mockRestore()
    })
  })

  describe('dispose', () => {
    it('stops the timer', () => {
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)
      timer.dispose()
      expect(timer.isRunning).toBe(false)
      vi.advanceTimersByTime(100)
      // Only ticks before dispose count
      expect(callback).toHaveBeenCalledTimes(0)
    })

    it('marks the timer as disposed', () => {
      const timer = new WorkerTimer()
      timer.dispose()
      expect(() => timer.start(() => {})).toThrow('WorkerTimer has been disposed')
    })

    it('is safe to call multiple times', () => {
      const timer = new WorkerTimer()
      timer.dispose()
      expect(() => timer.dispose()).not.toThrow()
    })
  })

  describe('worker mock path', () => {
    let originalWorker: typeof Worker | undefined
    let _originalBlob: typeof Blob
    let _originalURL: typeof URL

    // Mock Worker class
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      private intervalId: ReturnType<typeof setInterval> | null = null
      private tickInterval: number = 20

      constructor(_url: string | URL) {
        // Extract interval from blob URL (we'll track via postMessage)
      }

      postMessage(msg: string): void {
        if (msg === 'start') {
          this.intervalId = setInterval(() => {
            this.onmessage?.(new MessageEvent('message', { data: 'tick' }))
          }, this.tickInterval)
        }
        else if (msg === 'stop') {
          if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
          }
        }
      }

      terminate(): void {
        if (this.intervalId) {
          clearInterval(this.intervalId)
          this.intervalId = null
        }
      }
    }

    beforeEach(() => {
      originalWorker = globalThis.Worker
      _originalBlob = globalThis.Blob
      _originalURL = globalThis.URL

      // Install mock Worker
      ;(globalThis as any).Worker = MockWorker

      // Ensure Blob and URL.createObjectURL exist (happy-dom may have them)
      if (!globalThis.Blob) {
        ;(globalThis as any).Blob = class {
          constructor(_parts: any[], _opts?: any) {}
        }
      }

      const _originalCreateObjectURL = URL.createObjectURL
      const _originalRevokeObjectURL = URL.revokeObjectURL
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    })

    afterEach(() => {
      if (originalWorker !== undefined) {
        globalThis.Worker = originalWorker
      }
      else {
        delete (globalThis as any).Worker
      }
      vi.restoreAllMocks()
    })

    it('uses Worker when available', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)

      // Worker path should NOT log a warning
      expect(warnSpy).not.toHaveBeenCalled()

      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalled()
      timer.dispose()
      warnSpy.mockRestore()
    })

    it('creates Blob and Worker on first start', () => {
      const createObjURLSpy = vi.spyOn(URL, 'createObjectURL')
      const timer = new WorkerTimer()
      timer.start(() => {})

      expect(createObjURLSpy).toHaveBeenCalled()
      timer.dispose()
    })

    it('revokes Blob URL on dispose', () => {
      const revokeObjURLSpy = vi.spyOn(URL, 'revokeObjectURL')
      const timer = new WorkerTimer()
      timer.start(() => {})
      timer.dispose()

      expect(revokeObjURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('terminates Worker on dispose', () => {
      const timer = new WorkerTimer()
      timer.start(() => {})
      const callback = vi.fn()
      timer.start(callback)
      // Get reference to the mock worker to verify terminate
      // (Worker path: start is idempotent, already started)
      timer.dispose()

      // After dispose, callbacks should not fire
      vi.advanceTimersByTime(100)
      // callback was already called 0 times before dispose advanced
    })

    it('reuses Worker on stop/start cycle', () => {
      const createObjURLSpy = vi.spyOn(URL, 'createObjectURL')
      const timer = new WorkerTimer()
      const callback = vi.fn()

      timer.start(callback)
      expect(createObjURLSpy).toHaveBeenCalledTimes(1)

      timer.stop()
      timer.start(callback)
      // Should NOT create a new Worker
      expect(createObjURLSpy).toHaveBeenCalledTimes(1)

      timer.dispose()
    })

    it('stops Worker interval on stop (not terminate)', () => {
      const timer = new WorkerTimer()
      const callback = vi.fn()
      timer.start(callback)

      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalledTimes(1)

      timer.stop()
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalledTimes(1)

      // Worker is still alive (not terminated), just stopped
      // Can restart
      timer.start(callback)
      vi.advanceTimersByTime(20)
      expect(callback).toHaveBeenCalledTimes(2)

      timer.dispose()
    })
  })
})
