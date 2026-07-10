import { setMasterDestination } from 'ez-web-audio'

/**
 * A shared master stage every demo's audio routes through (via the core
 * `setMasterDestination` hook). Provides a safety limiter so no demo clips the
 * output, plus a peak meter the loudness E2E asserts against.
 *
 * This is docs-only tooling — NOT part of the public library. The only library
 * API it leans on is the `setMasterDestination(node)` hook.
 */
export interface DemoMasterBus {
  /** Demos route here (set as the global master destination). */
  input: AudioNode
  /** Max absolute sample in the analyser's current window (0..~1). */
  peak: () => number
  /** Tear down the bus and clear the global master destination. */
  dispose: () => void
}

// One bus per AudioContext (the library uses a single shared context, but a
// WeakMap keeps this correct if that ever changes and avoids leaking).
const busByContext = new WeakMap<AudioContext, DemoMasterBus>()

/**
 * Get (or lazily create) the demo master bus for a context and install it as
 * the global master destination. Idempotent per context.
 *
 * Chain: `input(gain) → limiter(DynamicsCompressor) → analyser → ctx.destination`.
 * The limiter (threshold −1 dBFS, ratio 20, fast attack) is a safety net, not an
 * effect — well-staged demos should barely engage it.
 */
export function getDemoMasterBus(ctx: AudioContext): DemoMasterBus {
  const existing = busByContext.get(ctx)
  if (existing)
    return existing

  const input = ctx.createGain()

  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -1 // dBFS — catch anything approaching clip
  limiter.knee.value = 0 // hard knee = true limiting
  limiter.ratio.value = 20 // brick-wall-ish
  limiter.attack.value = 0.001
  limiter.release.value = 0.05

  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048

  input.connect(limiter)
  limiter.connect(analyser)
  analyser.connect(ctx.destination)

  const frame = new Float32Array(analyser.fftSize)
  function peak(): number {
    analyser.getFloatTimeDomainData(frame)
    let max = 0
    for (let i = 0; i < frame.length; i++) {
      const a = Math.abs(frame[i])
      if (a > max)
        max = a
    }
    return max
  }

  function dispose(): void {
    setMasterDestination(null)
    for (const node of [input, limiter, analyser]) {
      try {
        node.disconnect()
      }
      catch {}
    }
    busByContext.delete(ctx)
  }

  const bus: DemoMasterBus = { input, peak, dispose }
  busByContext.set(ctx, bus)
  // Route every subsequently-created demo instance through this bus.
  setMasterDestination(input)
  return bus
}
