# LLM-01 — One-button UI sound

Build the smallest production-valid vanilla TypeScript feature in which one existing HTML button labeled “Save” plays `/audio/save.mp3` when clicked. Use EZ Web Audio's public package surface. The requested UI is the Save button and a concise error message if playback fails; do not invent other interface or infrastructure controls.

Provide complete files that can be placed in a minimal Vite TypeScript application. Keep loading, ownership, error handling, and cleanup explicit enough to evaluate, but do not add requirements the scenario does not need. Identify the exact user action and code site from which audio first becomes eligible to run.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-01",
  "condition": "docs-seeded",
  "answer": "Brief implementation explanation and tradeoffs.",
  "files": [{ "path": "relative/path.ts", "content": "complete file content" }],
  "activationSite": "Exact file, handler, and user action, or null when not applicable.",
  "assumptions": ["Explicit runtime or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition (`docs-seeded` or `package-aware`); use `docs-seeded` only if no condition was supplied. JSON-escape every file's complete content.
