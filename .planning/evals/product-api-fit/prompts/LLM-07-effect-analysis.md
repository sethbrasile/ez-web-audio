# LLM-07 — Add an effect and analyzer

Extend this existing vanilla TypeScript playback foundation using only EZ Web Audio public APIs:

```ts
import { createTrack } from 'ez-web-audio'

export async function createPlayer() {
  const track = await createTrack('/audio/program.mp3')
  return {
    play: () => track.play(),
    pause: () => track.pause(),
    seek: (seconds: number) => track.seek(seconds).as('seconds'),
    dispose: () => track.dispose(),
  }
}
```

Add a user-adjustable low-pass filter and a live frequency analyzer that drives a supplied `renderSpectrum(data: Uint8Array)` callback. Preserve the existing track, its play/pause/seek behavior, and the `createPlayer()` ownership boundary. The render loop, analyzer, effect, and playback must all stop/dispose with the player. Do not replace this foundation with a separate playback library or parallel audio session.

Provide complete replacement files and explain the graph, state ownership, cleanup order, native interoperation if any, and every change to the original public return shape.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-07",
  "condition": "docs-seeded",
  "answer": "Graph, ownership, cleanup, and continuity explanation.",
  "files": [{ "path": "relative/path.ts", "content": "complete file content" }],
  "activationSite": "Exact existing or revised user-action site, or null if supplied by the caller.",
  "assumptions": ["Explicit runtime or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition; use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
