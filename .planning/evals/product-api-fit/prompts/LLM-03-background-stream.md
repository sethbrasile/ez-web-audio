# LLM-03 — Long background stream

Build a minimal vanilla TypeScript background-music feature for `/audio/two-hour-program.mp3` using EZ Web Audio's public package surface where it fits. The media is two hours long, so choose an explicit buffered-versus-streamed loading strategy appropriate to that duration. The existing UI has Play, Pause, and Seek-to-60-seconds buttons plus a position label. The feature must release its resources when `disposeFeature()` is called.

Provide complete files for a minimal Vite TypeScript application. State which object owns the media resource and playback lifetime. If EZ's public surface cannot provide a true streamed path with these controls, say so plainly and use the smallest standards-based interoperation or fallback that preserves the requirement; do not call a fully downloaded/decoded buffer “streaming.” Identify the first audio-intent action and its code site.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-03",
  "condition": "docs-seeded",
  "answer": "Loading decision, ownership, implementation explanation, and limitations.",
  "files": [{ "path": "relative/path.ts", "content": "complete file content" }],
  "activationSite": "Exact file, handler, and user action, or null when not applicable.",
  "assumptions": ["Explicit runtime or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition; use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
