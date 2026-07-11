# react-basic-example

A minimal Vite + React + TypeScript app demonstrating [`@ez-web-audio/react`](https://www.npmjs.com/package/@ez-web-audio/react), the React hooks binding for [`ez-web-audio`](https://www.npmjs.com/package/ez-web-audio).

It shows three of the package's factory hooks, each initializing audio lazily on the user's first interaction (no "Load" button, per the library's demo conventions):

- **`useSound`** — one-shot playback of a short audio clip.
- **`useOscillator`** — play/stop toggle for a synthesized tone (sawtooth A4 with an ADSR envelope).
- **`usePolySynth`** — a three-key mini keyboard (C4/E4/G4) using `synth.play()` / `VoiceHandle.stop()` for polyphonic notes.

All three use `useCleanup().register(...)` so audio instances are stopped and disposed automatically on unmount.

## Running

```bash
npm install
npm run dev
```

Then open the printed local URL and click a button — that first click both loads the audio and satisfies the browser's user-gesture requirement for creating an `AudioContext`.

## Notes

- This example pins **published** versions of `ez-web-audio` and `@ez-web-audio/react` (not the `workspace:*` protocol used inside the monorepo), so it can be installed standalone from npm — including by embeds like StackBlitz.
- It lives outside the pnpm workspace (`pnpm-workspace.yaml` only includes `packages/*`) and is **not** part of the root build/test/lint pipeline. Use `npm`, not `pnpm`, inside this directory.
- The click sound is loaded from an absolute URL (`sethbrasile.github.io/ez-web-audio/audio/click.mp3`) since this app doesn't ship its own audio assets.
