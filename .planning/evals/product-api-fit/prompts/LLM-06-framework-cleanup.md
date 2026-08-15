# LLM-06 — React and Vue route cleanup

Implement the same route-owned feature twice: once in React and once in Vue, using the corresponding EZ Web Audio adapter package and public core APIs where needed. Each route renders a “Play Scene” button that plays `/audio/scene.mp3`, may be clicked repeatedly, and owns every playback, listener, and timer it creates. Navigating away must leave no route-owned active playback, listeners, or timers. Remounting must work without stale state or double-disposal failures.

The audio activation boundary must remain in the Play Scene interaction. It may not move into a React effect, Vue watcher, lifecycle hook, promise continuation, or eager module setup. Loading may be prepared elsewhere, but the user action must remain the activation site and must not be lost.

Provide complete TypeScript files for both framework versions and any focused tests. Explain semantic parity, ownership, cleanup ordering, Strict Mode/remount behavior, and the exact activation site in each implementation.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-06",
  "condition": "docs-seeded",
  "answer": "React/Vue parity, ownership, activation, and cleanup explanation.",
  "files": [{ "path": "relative/path.tsx-or-vue", "content": "complete file content" }],
  "activationSite": "Exact React handler and Vue handler plus their user action.",
  "assumptions": ["Explicit runtime, router, or package assumptions."]
}
```

Set `condition` to the evaluator-provided run condition (`docs-seeded` or `package-aware`); use `docs-seeded` only if none was supplied. JSON-escape every file's complete content.
