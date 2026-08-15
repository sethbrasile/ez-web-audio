# LLM-05 — First-interaction activation and recovery

Build a minimal vanilla TypeScript sound feature using EZ Web Audio's public package surface. Browser autoplay restrictions apply. The first meaningful user interaction is clicking the existing “Play Welcome” button, and that first click must both begin `/audio/welcome.mp3` and remain effective if the asset is still loading. If the audio context later becomes suspended or interrupted after backgrounding, the next click on that same button must recover and play. Display a concise actionable error only when the attempted action cannot be completed.

Provide complete files for a minimal Vite TypeScript application. Explain the exact activation site, why it is eligible, where asynchronous work occurs, how the original requested action is preserved, and how recovery is observed and tested. Use only public APIs and do not assume browser state changes are impossible.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-05",
  "condition": "docs-seeded",
  "answer": "Activation, async loading, recovery, and error-handling explanation.",
  "files": [{ "path": "relative/path.ts", "content": "complete file content" }],
  "activationSite": "Exact file, handler, and user action.",
  "assumptions": ["Explicit runtime or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition (`docs-seeded` or `package-aware`); use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
