# @ez-web-audio/react

React hooks for [ez-web-audio](https://sethbrasile.github.io/ez-web-audio) — reactive wrappers around the core library.

Every core factory gets a hook with a uniform shape — `{ instance, loading, error, load }` — plus `useCleanup()` for automatic disposal on unmount and `useAudioContext()` for init state. Nothing touches an `AudioContext` until you call `load()`/`init()` from a user gesture, so components are SSR-safe by construction.

```
npm install @ez-web-audio/react
```

## Usage

```tsx
import { useCleanup, useOscillator } from '@ez-web-audio/react'

function ToneButton() {
  const { instance: osc, loading, error, load } = useOscillator()
  const { register } = useCleanup()

  // First user interaction initializes audio — no separate "load" button.
  async function toggle(): Promise<void> {
    if (!osc) {
      register(await load({ frequency: 220, type: 'sawtooth' }))
      return
    }
    osc.isPlaying ? osc.stop() : osc.play()
  }

  return (
    <>
      <button disabled={loading} onClick={toggle}>
        {loading ? 'Starting…' : osc?.isPlaying ? 'Stop' : 'Play'}
      </button>
      {error && <p role="alert">{error.message}</p>}
    </>
  )
}
```

`useCleanup().register(obj)` returns its argument and guarantees `stop()` then `dispose()` when the component unmounts — even if another registered object throws during cleanup. `register` and `disposeAll` are stable (`useCallback`-wrapped) across re-renders, so they're safe to use in effect dependency arrays.

## Hooks

| Hook | Wraps |
|---|---|
| `useSound` | `createSound` |
| `useTrack` | `createTrack` |
| `useOscillator` | `createOscillator` |
| `useSampler` | `createSampler` |
| `usePolySynth` | `createPolySynth` |
| `useGrainPlayer` | `createGrainPlayer` |
| `useLFO` | `createLFO` |
| `useTransport` | `createTransport` |
| `useSequence` | `createSequence` |
| `useAnalyzer` | `createAnalyzer` |
| `useFont` | `createFont` |
| `useSprite` | `createSprite` |
| `useLayeredSound` | `createLayeredSound` |
| `useWhiteNoise` | `createWhiteNoise` |
| `useBeatTrack` | `createBeatTrack` (see reactivity caveat below — unlike the Vue composable, `Beat` mutations do **not** trigger re-renders) |
| `useAudioContext` | `initAudio` — `{ ready, init }` |
| `useCleanup` | disposal on unmount — `{ register, disposeAll }` |

`createFactoryHook` is also exported for wrapping custom async factories with the same shape.

## `useBeatTrack` reactivity caveat

Unlike the Vue composable (which defaults `wrapWith` to Vue's `reactive()`), `useBeatTrack` does **not** wrap `Beat` objects in anything — React has no built-in equivalent of Vue's `reactive()` proxy that would let mutations on a `Beat` instance (`active`, `isPlaying`, `currentTimeIsPlaying`, ...) automatically trigger a re-render. `beatTrack.beats` stays an array of plain `Beat` instances; mutating one directly will **not** update your UI.

To reflect `BeatTrack` playback state in React, either:

- Poll `beatTrack.beats` on a `requestAnimationFrame` loop and copy the fields you care about into `useState`, or
- Subscribe to the library's `beat` event and call `setState` from the listener.

```tsx
useEffect(() => {
  if (!beatTrack)
    return
  const handleBeat = () => setTick(t => t + 1) // force a re-render on each beat
  beatTrack.on('beat', handleBeat)
  return () => beatTrack.off('beat', handleBeat)
}, [beatTrack])
```
