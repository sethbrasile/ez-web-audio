/**
 * Shared Worker-backed timer utility for background-tab-resilient scheduling.
 *
 * Creates an inline Blob Worker that fires tick callbacks at a regular interval,
 * immune to browser background-tab setTimeout throttling. Falls back gracefully
 * to setTimeout when Web Workers are unavailable (SSR, test environments).
 *
 * Used by both Transport (global clock) and BeatTrack (standalone scheduler)
 * to ensure consistent timing regardless of tab visibility.
 *
 * @example
 * ```typescript
 * const timer = new WorkerTimer({ interval: 20 })
 *
 * timer.start(() => {
 *   // Called every ~20ms, even in background tabs
 *   scheduleUpcomingBeats()
 * })
 *
 * timer.stop()   // Pause ticking (Worker stays alive)
 * timer.start(() => { ... })  // Resume
 * timer.dispose()  // Terminate Worker, revoke Blob URL
 * ```
 */

export interface WorkerTimerOptions {
  /** Tick interval in milliseconds. Default 20, clamped to 10-25ms range. */
  interval?: number
}

export class WorkerTimer {
  private worker: Worker | null = null
  private blobUrl: string | null = null
  private fallbackId: ReturnType<typeof setTimeout> | null = null
  private callback: (() => void) | null = null
  private _isRunning = false
  private _isDisposed = false
  private readonly useWorker: boolean
  private readonly interval: number

  constructor(opts?: WorkerTimerOptions) {
    this.interval = Math.max(10, Math.min(25, opts?.interval ?? 20))
    this.useWorker = typeof Worker !== 'undefined'
      && typeof URL !== 'undefined'
      && typeof URL.createObjectURL === 'function'
      && typeof Blob !== 'undefined'
  }

  /** Whether the timer is currently firing tick callbacks. */
  get isRunning(): boolean {
    return this._isRunning
  }

  /**
   * Start firing tick callbacks at the configured interval.
   *
   * Creates the Worker lazily on first call. Subsequent calls after stop()
   * reuse the existing Worker. Idempotent — calling start() while already
   * running is a no-op.
   *
   * @param callback - Function called on each tick
   * @throws If the timer has been disposed
   */
  start(callback: () => void): void {
    if (this._isDisposed) {
      throw new Error('WorkerTimer has been disposed')
    }
    if (this._isRunning) return

    this.callback = callback

    if (this.useWorker) {
      if (!this.worker) {
        const code = `let id=null;self.onmessage=e=>{if(e.data==='start'){if(id)clearInterval(id);id=setInterval(()=>self.postMessage('tick'),${this.interval})}else if(e.data==='stop'){if(id){clearInterval(id);id=null}}}`
        const blob = new Blob([code], { type: 'application/javascript' })
        this.blobUrl = URL.createObjectURL(blob)
        this.worker = new Worker(this.blobUrl)
        this.worker.onmessage = () => { this.callback?.() }
      }
      this.worker.postMessage('start')
    }
    else {
      console.warn(
        'ez-web-audio: Web Workers unavailable, using setTimeout fallback for scheduling. Background tab timing may drift.',
      )
      const loop = (): void => {
        if (!this._isRunning) return
        this.callback?.()
        this.fallbackId = setTimeout(loop, this.interval)
      }
      this.fallbackId = setTimeout(loop, this.interval)
    }

    this._isRunning = true
  }

  /**
   * Stop firing tick callbacks. The Worker stays alive for efficient restart.
   * No-op if not currently running.
   */
  stop(): void {
    if (!this._isRunning) return

    if (this.useWorker && this.worker) {
      this.worker.postMessage('stop')
    }
    else if (this.fallbackId !== null) {
      clearTimeout(this.fallbackId)
      this.fallbackId = null
    }

    this._isRunning = false
  }

  /**
   * Terminate the Worker, revoke the Blob URL, and release all resources.
   * After disposal, start() will throw. Safe to call multiple times.
   */
  dispose(): void {
    this.stop()

    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = null
    }

    this.callback = null
    this._isDisposed = true
  }
}
