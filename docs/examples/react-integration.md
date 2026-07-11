---
title: React Integration - @ez-web-audio/react Hooks
description: "Integrate ez-web-audio into React with the official @ez-web-audio/react hooks package: the uniform factory-hook shape shared with Vue, useCleanup, useAudioContext, full working examples, SSR/Next.js notes, and the BeatTrack polling pattern that replaces Vue's reactive() wrapping."
---

# React Integration

[`@ez-web-audio/react`](https://www.npmjs.com/package/@ez-web-audio/react) is the official React bindings package for `ez-web-audio` — a set of hooks, not a bespoke `useRef`/`useEffect` pattern you write yourself. It ships one hook per `createX` factory in the core library, plus two lifecycle helpers (`useCleanup`, `useAudioContext`), all sharing a single uniform shape.

This page covers the real package: install, the hook shape, cleanup, three full working examples, an SSR/Next.js note, and the one place React and Vue meaningfully diverge — reflecting `BeatTrack` playback state in the UI.

## Install

```bash
npm i ez-web-audio @ez-web-audio/react
```

`ez-web-audio` is a peer dependency — install both.

## The Hook Shape

Every factory hook returns the same four fields:

```typescript
interface UseFactoryReturn<T, Args extends unknown[]> {
  instance: T | null
  loading: boolean
  error: Error | null
  load: (...args: Args) => Promise<T>
  reset: () => void
}
```

Nothing happens until you call `load(...)`. `instance` stays `null`, `loading` stays `false`, and — critically for SSR — no `AudioContext` is touched until then.

This shape is **identical, field for field, to `@ez-web-audio/vue`'s composables**. If you already know one package, you know the other's data model; only the reactivity mechanism around it differs (see the BeatTrack section below).

15 factory hooks ship, one per `createX` factory:

`useAnalyzer`, `useBeatTrack`, `useFont`, `useGrainPlayer`, `useLayeredSound`, `useLFO`, `useOscillator`, `usePolySynth`, `useSampler`, `useSequence`, `useSound`, `useSprite`, `useTrack`, `useTransport`, `useWhiteNoise`.

Plus two lifecycle hooks that aren't factories:

- **`useCleanup`** — registers instances for automatic teardown on unmount.
- **`useAudioContext`** — exposes the shared `AudioContext`'s ready state and an explicit `init()`.

## Cleanup and First-Interaction Init

Audio instances (`Sound`, `Oscillator`, `PolySynth`, ...) are mutable class instances wrapping live Web Audio nodes — not serializable render data. The factory hooks already hold them correctly (via internal `useState`, so `instance` updates trigger a re-render when `load()` resolves); you never need a second `useRef` or `useState` just to hold the same instance. Where a plain `useRef` **is** the right tool is for imperative handles you manage yourself — a `Map<string, VoiceHandle>` for concurrent polysynth notes, for example (see `MiniKeyboard` below).

`useCleanup()` gives you a `register()` function. Anything you register gets `.stop()` and `.dispose()` called automatically in a `useEffect` cleanup when the component unmounts:

```tsx
import { useCleanup, useSound } from '@ez-web-audio/react'

function ClickButton() {
  const { instance, loading, load } = useSound()
  const cleanup = useCleanup()

  async function handleClick() {
    if (instance) {
      instance.play()
      return
    }
    const sound = await load('/audio/click.mp3')
    cleanup.register(sound) // stopped + disposed automatically on unmount
    sound.play()
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading}>
      {loading ? 'Loading…' : 'Play'}
    </button>
  )
}
```

No `AudioContext` exists until that first click. The library lazily creates it inside `load()`/`createSound()`, which satisfies the browser's user-gesture requirement for free — there's no separate "init" step required for the common case.

If you need to warm up the shared context ahead of a factory hook — for example, priming iOS's audio unlock before the user reaches the control that calls `load()` — call `useAudioContext().init()` from an event handler:

```tsx
import { useAudioContext } from '@ez-web-audio/react'

function UnlockButton() {
  const { ready, init } = useAudioContext()

  return (
    <button type="button" onClick={() => init()} disabled={ready}>
      {ready ? 'Audio ready' : 'Enable audio'}
    </button>
  )
}
```

`init()` is idempotent and safe to call multiple times or from multiple components — it de-dupes concurrent calls and resolves immediately once the context is ready.

## Full Examples

These match [`examples/react-basic/src/App.tsx`](https://github.com/sethbrasile/ez-web-audio/blob/main/examples/react-basic/src/App.tsx) exactly — a minimal Vite + React app that exercises three hooks with no "Load" button, per the library's demo conventions (audio initializes on the user's first interaction).

### One-shot playback — `useSound`

```tsx
function ClickSound() {
  const { instance, loading, error, load } = useSound()
  const cleanup = useCleanup()

  async function handleClick() {
    if (instance) {
      // Already loaded — just replay it.
      instance.play()
      return
    }
    const sound = await load('https://sethbrasile.github.io/ez-web-audio/audio/click.mp3')
    cleanup.register(sound)
    sound.play()
  }

  return (
    <section>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'Loading…' : 'Play Click'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </section>
  )
}
```

### Play/stop toggle — `useOscillator`

```tsx
function OscillatorToggle() {
  const { instance, loading, error, load } = useOscillator()
  const cleanup = useCleanup()
  const [playing, setPlaying] = useState(false)

  async function handleClick() {
    let osc = instance
    if (!osc) {
      osc = await load({
        frequency: 440, // A4
        type: 'sawtooth',
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
      })
      cleanup.register(osc)
    }

    if (playing) {
      await osc.stop()
      setPlaying(false)
    }
    else {
      await osc.play()
      setPlaying(true)
    }
  }

  return (
    <section>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'Loading…' : playing ? 'Stop' : 'Play A4 Sawtooth'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </section>
  )
}
```

### Mini keyboard — `usePolySynth` and `VoiceHandle`

`PolySynth` has no `noteOn`/`noteOff` pair. Instead `synth.play(...)` returns a `VoiceHandle` per note, and `handle.stop()` releases exactly that voice. A `Map<string, VoiceHandle>` in a `useRef` — not `useState` — tracks which handle belongs to which held key, so pointer-up releases the right voice:

```tsx
import type { PolySynth, VoiceHandle } from 'ez-web-audio'

function MiniKeyboard() {
  const { instance, loading, error, load } = usePolySynth()
  const cleanup = useCleanup()
  const handles = useRef(new Map<string, VoiceHandle>())

  async function ensureSynth(): Promise<PolySynth> {
    if (instance)
      return instance
    const synth = await load({
      type: 'triangle',
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
    })
    cleanup.register(synth)
    return synth
  }

  async function noteOn(note: string, frequency: number) {
    const synth = await ensureSynth()
    handles.current.set(note, synth.play({ frequency }))
  }

  function noteOff(note: string) {
    const handle = handles.current.get(note)
    if (handle) {
      void handle.stop()
      handles.current.delete(note)
    }
  }

  return (
    <section>
      <div className="keyboard">
        {KEYS.map(({ note, frequency }) => (
          <button
            key={note}
            type="button"
            disabled={loading}
            onPointerDown={() => noteOn(note, frequency)}
            onPointerUp={() => noteOff(note)}
            onPointerLeave={() => noteOff(note)}
          >
            {note}
          </button>
        ))}
      </div>
      {error && <p className="error">{error.message}</p>}
    </section>
  )
}
```

`onPointerDown`/`onPointerUp` (not `onClick`) so holding the key sustains the note, and `onPointerLeave` releases it even if the pointer drags off the button while held.

## SSR and Next.js

Importing `ez-web-audio` and `@ez-web-audio/react` is safe at module scope in an SSR environment — the shared `AudioContext` is created lazily inside `getOrCreateAudioContext()`, which only runs when a factory hook's `load()` (or `useAudioContext().init()`) actually executes from an event handler. No top-level code touches `window` or constructs an `AudioContext`.

Even so, in a Next.js App Router project:

- Add `'use client'` to the top of any component file that calls these hooks — they use `useState`/`useEffect`/`useRef` internally and cannot run in a Server Component.
- Don't call `load()` in a bare `useEffect` on mount — that reintroduces the "AudioContext created without a user gesture" problem the hooks are designed to avoid. Gate audio creation behind a real interaction (click, keypress), exactly as the examples above do.
- `useAudioContext()`'s own `init()` dynamically `import()`s `ez-web-audio` rather than importing it eagerly — a defensive pattern worth mirroring if you lazy-load other browser-only modules alongside it. Combine with `next/dynamic` (`{ ssr: false }`) for a component if it does non-audio browser-only work too (canvas, `ResizeObserver`, etc.) at render time — the hooks themselves don't require it.

## BeatTrack: Where React and Vue Diverge

`useBeatTrack` returns the same `{ instance, loading, error, load, reset }` shape as every other hook — `instance` is a real `BeatTrack` with a `beats` array. This is the one spot where the parity with `@ez-web-audio/vue` breaks, because the two frameworks have fundamentally different reactivity models:

| | `@ez-web-audio/vue` | `@ez-web-audio/react` |
|---|---|---|
| `beats` array | Wrapped via `wrapWith: beat => reactive(beat)` | Plain `Beat` instances, unwrapped |
| Mutating `beat.active`/`currentTimeIsPlaying` | Triggers a re-render automatically | **Invisible to React** — no proxy, no signal |
| How the UI reflects playback | Template binds directly to `beat.currentTimeIsPlaying` | Poll on `requestAnimationFrame`, or listen for the `beat` event |
| Setup cost | One option (`wrapWith`) | A small polling loop or event subscription |

Vue's `reactive()` is a proxy that Vue's renderer already watches; React has no built-in equivalent that works on a plain class instance. `BeatTrack.beats[i].active = true` will change the object, but nothing tells React to re-render — you have to ask for the update yourself, one of two ways.

### Pattern A: `requestAnimationFrame` polling

Read `beatTrack.beats` every frame and copy the fields you care about into state:

```tsx
function useBeatTrackPlayhead(beatTrack: BeatTrack | null) {
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!beatTrack)
      return

    function tick() {
      const playing = beatTrack!.beats.findIndex(b => b.currentTimeIsPlaying)
      setCurrentBeat(playing === -1 ? null : playing)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [beatTrack])

  return currentBeat
}
```

This is the same rAF-over-`audioContext.currentTime` mechanism the library uses internally for timing — see [Vanilla TS Events](/examples/drum-machine-vanilla#audiocontext-aware-timing) for why it doesn't drift.

### Pattern B: the `beat` event

`BeatTrack` emits a `beat` event at play time via its internal `TypedEventEmitter`, carrying `{ time, beatIndex, active, source }` in `event.detail`. Subscribe in a `useEffect` and mirror it into state:

```tsx
function useBeatTrackPlayhead(beatTrack: BeatTrack | null) {
  const [currentBeat, setCurrentBeat] = useState<number | null>(null)

  useEffect(() => {
    if (!beatTrack)
      return

    function onBeat(e: CustomEvent<{ beatIndex: number, active: boolean }>) {
      setCurrentBeat(e.detail.beatIndex)
    }

    beatTrack.on('beat', onBeat)
    return () => beatTrack.off('beat', onBeat)
  }, [beatTrack])

  return currentBeat
}
```

Either pattern works — polling is simpler when you also need continuous values (e.g. driving a CSS transform every frame); the event is cheaper when you only care about discrete beat boundaries. Both ride the same `audioContextAwareTimeout` scheduling as the Vue `reactive()` path, so timing precision is identical across all three approaches — only the plumbing that gets state into your UI differs.

## Try It: StackBlitz

<llm-exclude>

<iframe
  src="https://stackblitz.com/github/sethbrasile/ez-web-audio/tree/main/examples/react-basic?file=src/App.tsx&embed=1"
  style="width: 100%; height: 500px; border: 0; border-radius: 4px; overflow: hidden;"
  title="ez-web-audio React example on StackBlitz"
  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads"
></iframe>

</llm-exclude>

<!--
  This embed reads examples/react-basic from the main branch on GitHub and
  installs published ^0.2.0 versions of `ez-web-audio` and `@ez-web-audio/react`
  from npm. As of this writing neither is true yet: ez-web-audio is published
  only through 0.1.0, @ez-web-audio/react isn't on npm at all, and this repo's
  local main is ~66 commits ahead of origin/main. The embed will start working
  once the example merges into origin's main branch and both packages publish
  at 0.2.0. Until then it will show StackBlitz's "not found" state — the plain
  link below is the reliable fallback.
-->

<llm-only>

Live StackBlitz embed of the full `examples/react-basic` app (three sections: `useSound`, `useOscillator`, `usePolySynth`). Not renderable in this context — use the link below.

</llm-only>

Prefer opening it directly? [github.com/sethbrasile/ez-web-audio/tree/main/examples/react-basic](https://github.com/sethbrasile/ez-web-audio/tree/main/examples/react-basic)

## See Also

- [Vue Reactive Pattern](/examples/drum-machine-vue) — the `@ez-web-audio/vue` composables, same hook shape, `wrapWith: reactive()` for BeatTrack
- [Vanilla TS Events](/examples/drum-machine-vanilla) — the `beat` event and `audioContextAwareTimeout` explained in depth
- [Core Concepts](/guide/concepts) — the library's architecture underneath every binding
- [Parameter Control](/guide/parameter-control) — automate gain, frequency, and other parameters
