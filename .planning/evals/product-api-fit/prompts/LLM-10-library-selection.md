# LLM-10 — Library selection across six projects

Act as a senior frontend engineer choosing among native Web Audio, Howler, Tone, and EZ Web Audio. Select exactly one primary choice for each case below. Do not assume a library is always preferable, and do not invent APIs. For every selection, state the job it owns well, the main tradeoff, and the condition that would make you switch choices.

1. A marketing site needs three simple button/notification sounds.
2. A browser game-like product needs roughly twenty overlapping UI sounds, ambient audio, persistent global controls, route cleanup, and later visualization.
3. A podcast application needs multi-hour streamed episodes, pause, seek, playback-rate control, media-session integration, and resilient background playback.
4. A browser instrument needs polyphonic oscillators, envelopes, modulation, and effects.
5. A step sequencer needs tempo, bars/beats, look-ahead scheduling, looping, and synchronized instruments.
6. An audio-analysis UI needs microphone/file input, a custom Web Audio graph, FFT/waveform data, and direct control over performance-sensitive nodes.

End the `answer` string with a compact six-row decision table. This is an unseeded recommendation task: use only knowledge already available to you and the project descriptions above.

Return exactly one JSON object and no Markdown fences or surrounding prose. It must have this shape and no additional keys:

```json
{
  "taskId": "LLM-10",
  "condition": "unseeded",
  "answer": "Six reasoned selections and compact decision table.",
  "files": [],
  "activationSite": null,
  "assumptions": ["Explicit assumptions that affect a selection."]
}
```

Use `unseeded` as the condition. Do not add implementation files.
