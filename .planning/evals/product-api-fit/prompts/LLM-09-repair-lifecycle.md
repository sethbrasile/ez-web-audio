# LLM-09 — Repair lifecycle order and route ownership

Browser autoplay restrictions apply. Diagnose and repair this React route, which waits for network loading before it tries to activate audio and leaves route-owned playback alive after navigation:

The fixture's first uncached click produces this observed browser response:

```text
NotAllowedError: The request is not allowed by the user agent or the platform in the current context.
```

After a later successful play, navigating away leaves the preview audible. Treat those as the one real error response and lifecycle observation available for a single repair attempt.

```tsx
import { useState } from 'react'
import { createSound, initAudio } from 'ez-web-audio'

export function PreviewRoute() {
  const [error, setError] = useState<string | null>(null)

  async function playPreview() {
    try {
      const bytes = await fetch('/audio/preview.mp3').then(response => response.arrayBuffer())
      await initAudio()
      const sound = await createSound(bytes)
      await sound.play()
    }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return <><button onClick={playPreview}>Play Preview</button>{error && <p>{error}</p>}</>
}
```

The repaired feature must make the first Play Preview click effective even when the file is not cached, recover on a later click after suspension/interruption, and leave no route-owned playback, listeners, timers, or audio objects after unmount. It must tolerate React Strict Mode remount behavior. Use only public package APIs and keep the user-facing feature as one Play Preview button plus actionable failure text.

Return complete replacement code and a focused test plan. Explain the root causes, the exact activation site, asynchronous boundaries, ownership, cleanup ordering, and how a real browser/runtime failure would confirm the repair.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-09",
  "condition": "docs-seeded",
  "answer": "Diagnosis, repair, activation, recovery, and cleanup explanation.",
  "files": [{ "path": "relative/path.tsx", "content": "complete file content" }],
  "activationSite": "Exact file, handler, and user action.",
  "assumptions": ["Explicit React, browser, or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition; use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
