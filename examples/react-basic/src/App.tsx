import type { PolySynth, VoiceHandle } from 'ez-web-audio'
import type { ReactElement } from 'react'
import { useCleanup, useOscillator, usePolySynth, useSound } from '@ez-web-audio/react'
import { frequencyMap } from 'ez-web-audio'
import { useRef, useState } from 'react'

// Absolute URL because this app is standalone (not served alongside the
// ez-web-audio docs site, which hosts its demo assets under /audio/).
const CLICK_URL = 'https://sethbrasile.github.io/ez-web-audio/audio/click.mp3'

const KEYS: { note: string, frequency: number }[] = [
  { note: 'C4', frequency: frequencyMap.C4 },
  { note: 'E4', frequency: frequencyMap.E4 },
  { note: 'G4', frequency: frequencyMap.G4 },
]

/**
 * Section 1 — one-shot playback with `useSound`.
 *
 * `useSound` gives back the uniform `{ instance, loading, error, load, reset }`
 * shape shared by every factory hook in @ez-web-audio/react. Nothing loads
 * until the button is pressed — that first click is also what satisfies the
 * browser's "audio needs a user gesture" requirement.
 */
function ClickSound(): ReactElement {
  const { instance, loading, error, load } = useSound()
  const cleanup = useCleanup()

  async function handleClick(): Promise<void> {
    if (instance) {
      // Already loaded — just replay it.
      instance.play()
      return
    }
    const sound = await load(CLICK_URL)
    cleanup.register(sound) // stopped/disposed automatically on unmount
    sound.play()
  }

  return (
    <section>
      <h2>useSound — one-shot playback</h2>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'Loading…' : 'Play Click'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </section>
  )
}

/**
 * Section 2 — `useOscillator` play/stop toggle.
 *
 * A sawtooth at A4 (440Hz) with a short ADSR envelope, matching the idiomatic
 * envelope shape used throughout the docs (see /examples/synthesis).
 */
function OscillatorToggle(): ReactElement {
  const { instance, loading, error, load } = useOscillator()
  const cleanup = useCleanup()
  const [playing, setPlaying] = useState(false)

  async function handleClick(): Promise<void> {
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
      <h2>useOscillator — play / stop</h2>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'Loading…' : playing ? 'Stop' : 'Play A4 Sawtooth'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </section>
  )
}

/**
 * Section 3 — `usePolySynth` three-key mini keyboard.
 *
 * PolySynth has no built-in noteOn/noteOff API — instead `synth.play(...)`
 * returns a `VoiceHandle` per note, and `handle.stop()` releases that one
 * voice. We keep a ref (not state — it's an imperative handle registry, not
 * render data) mapping note name -> VoiceHandle so pointerup can release the
 * exact voice that pointerdown started.
 */
function MiniKeyboard(): ReactElement {
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

  async function noteOn(note: string, frequency: number): Promise<void> {
    const synth = await ensureSynth()
    handles.current.set(note, synth.play({ frequency }))
  }

  function noteOff(note: string): void {
    const handle = handles.current.get(note)
    if (handle) {
      void handle.stop()
      handles.current.delete(note)
    }
  }

  return (
    <section>
      <h2>usePolySynth — mini keyboard</h2>
      <div className="keyboard">
        {KEYS.map(({ note, frequency }) => (
          <button
            key={note}
            type="button"
            disabled={loading}
            // pointerdown/up (not click) so holding the key sustains the
            // note and releasing it — even by dragging off the button —
            // reliably stops the voice.
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

export default function App(): ReactElement {
  return (
    <>
      <style>
        {`
          body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto; padding: 0 1rem; }
          section { margin-bottom: 2rem; }
          h1 { font-size: 1.25rem; }
          h2 { font-size: 1rem; color: #555; }
          button { font-size: 1rem; padding: 0.5rem 1rem; margin-right: 0.5rem; cursor: pointer; }
          .keyboard { display: flex; gap: 0.5rem; }
          .error { color: #c00; font-size: 0.875rem; }
        `}
      </style>
      <h1>ez-web-audio + React</h1>
      <p>
        Three hooks from
        {' '}
        <code>@ez-web-audio/react</code>
        {' '}
        — nothing loads or initializes audio until you press a button.
      </p>
      <ClickSound />
      <OscillatorToggle />
      <MiniKeyboard />
    </>
  )
}
