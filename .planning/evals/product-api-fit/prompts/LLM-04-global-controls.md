# LLM-04 — Persistent global controls

Build a minimal vanilla TypeScript audio-settings feature using EZ Web Audio's public package surface. The application can already be playing `/audio/ambient.mp3`; later it may create additional UI sounds. A volume slider and mute checkbox must affect all current and future application audio. The values persist across reloads with `localStorage`, apply at startup, and unmuting restores the selected volume. Include disposal for anything this feature owns.

Provide complete files for a minimal Vite TypeScript application and a short explanation of routing order, state ownership, persistence, and what happens to audio objects created before and after the controls initialize. Do not claim global coverage that the public API does not actually provide; if a public limitation requires a small explicit routing design, show it.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-04",
  "condition": "docs-seeded",
  "answer": "Routing, persistence, ownership, and limitation explanation.",
  "files": [{ "path": "relative/path.ts", "content": "complete file content" }],
  "activationSite": "Exact file, handler, and user action, or null when not applicable.",
  "assumptions": ["Explicit runtime or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition; use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
