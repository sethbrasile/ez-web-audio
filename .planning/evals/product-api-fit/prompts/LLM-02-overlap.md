# LLM-02 — Rapid overlapping playback

Build a minimal vanilla TypeScript interaction using EZ Web Audio's public package surface. An existing button labeled “Hit” plays `/audio/hit.mp3`. A user may click rapidly, and every click must start a new audible occurrence without cutting off any earlier occurrence. Include a Stop All button that stops every still-active occurrence created by this feature, and dispose everything the feature owns when `disposeFeature()` is called.

Make the distinction between reusable loaded audio and each active occurrence clear in the explanation and code. Provide complete files for a minimal Vite TypeScript application, including any small ownership collection needed. Do not silently weaken the overlap or cleanup requirements if the public API cannot express an independently controllable occurrence; explain the limitation and implement the closest honest public-surface behavior.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-02",
  "condition": "docs-seeded",
  "answer": "Brief implementation explanation, occurrence model, and limitations.",
  "files": [{ "path": "relative/path.ts", "content": "complete file content" }],
  "activationSite": "Exact file, handler, and user action, or null when not applicable.",
  "assumptions": ["Explicit runtime or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition; use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
