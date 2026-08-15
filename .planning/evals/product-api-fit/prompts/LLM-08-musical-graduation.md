# LLM-08 — Graduate into musical timing

Extend an existing application-audio feature that already owns a background `Track`, a reusable UI `Sound`, global volume routing, and one `disposeFeature()` boundary. Add an optional transport-driven four-beat countdown. When the user clicks “Start Timed Mode,” the transport schedules the existing UI sound on beats 1–4 and starts the existing background track on the next bar. Tempo is adjustable before or during the countdown. Ordinary untimed UI-sound and background-track controls must continue to work.

Use EZ Web Audio public APIs. Preserve the existing resource/playback ownership, routing, and disposal foundation; add musical time to it rather than replacing it with a parallel engine or reconstructing the audio resources. Provide a complete minimal TypeScript module plus the smallest calling example needed to show the existing and timed paths. Explain scheduling, tempo changes, ownership, cancellation, cleanup order, and architectural continuity.

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
