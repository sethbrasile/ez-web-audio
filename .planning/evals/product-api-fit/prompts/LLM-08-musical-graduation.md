# LLM-08 — Graduate into musical timing

Extend this existing application-audio module with an optional transport-driven four-beat countdown:

```ts
import { createSound, createTrack, muteAll, setGlobalVolume } from 'ez-web-audio'

export interface AudioFeature {
  playUi: () => Promise<void>
  playBackground: () => Promise<void>
  pauseBackground: () => void
  setVolume: (value: number) => void
  setMuted: (muted: boolean) => void
  disposeFeature: () => Promise<void>
}

export async function createAudioFeature(): Promise<AudioFeature> {
  setGlobalVolume(0.8)
  const [uiSound, backgroundTrack] = await Promise.all([
    createSound('/audio/ui-tick.mp3'),
    createTrack('/audio/background.mp3'),
  ])

  return {
    playUi: () => uiSound.play(),
    playBackground: () => backgroundTrack.play(),
    pauseBackground: () => backgroundTrack.pause(),
    setVolume: value => setGlobalVolume(value),
    setMuted: muted => muteAll(muted),
    async disposeFeature() {
      await Promise.all([uiSound.stop(), backgroundTrack.stop()])
      uiSound.dispose()
      backgroundTrack.dispose()
    },
  }
}
```

When the user clicks “Start Timed Mode,” the transport schedules the existing UI sound on beats 1–4 and starts the existing background track on the next bar. Tempo is adjustable before or during the countdown. Preserve the exported `AudioFeature` name and all six existing method declarations exactly; extend it only with the smallest additional methods needed for timed-mode start, tempo change, and cancellation. Ordinary untimed UI-sound and background-track controls must continue to work.

Use EZ Web Audio public APIs. Preserve the existing `uiSound` and `backgroundTrack` resource identities, playback methods, global routing calls, and single `disposeFeature()` ownership boundary; add musical time to this module rather than replacing it with a parallel engine or reconstructing the audio resources. Provide the complete extended TypeScript module plus the smallest calling example needed to show the existing and timed paths. Explain scheduling, tempo changes, ownership, cancellation, cleanup order, and architectural continuity.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-08",
  "condition": "docs-seeded",
  "answer": "Timing, ownership, cancellation, and continuity explanation.",
  "files": [{ "path": "relative/path.ts", "content": "complete file content" }],
  "activationSite": "Exact timed-mode user-action site, or null if supplied by the caller.",
  "assumptions": ["Explicit runtime or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition; use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
