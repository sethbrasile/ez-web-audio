# 75 Spike — How demo audio reaches a master bus

**Task 1 of 75-01.** Read-only investigation of the core routing chain to decide how every demo's output can be routed through a shared limiter/peak-meter bus.

## Findings (with line references, `packages/core/src`)

The connection chain (`base-sound.ts:335-382`) ends at a per-instance `_destination: AudioNode` that **defaults to `audioContext.destination`** (`base-sound.ts:226`). Re-wiring runs through `wireConnections()` and honors `_destination`.

**Public `setDestination(node): this` exists on** — and re-wires correctly for:
- `BaseSound` → `Sound`, `Track`, `Oscillator`, `SampledNote` (`base-sound.ts:527`)
- `LayeredSound` (`layered-sound.ts:76` routes children into its own `outputBus`; own `_destination` at `:72`, setter present)
- `GrainPlayer` (`grain-player.ts:563`)
- `PolySynth` (`poly-synth.ts:771`; voices route to `sharedBusInput` → its `_destination`)

**Does NOT have its own destination / `setDestination`:**
- `Sampler` (`sampler.ts:33`) holds `sounds: Set<Playable & Connectable>` and delegates — `play()` calls the child `Sound.play()` (`sampler.ts:84`). Child Sounds route to *their* `_destination`. To bus a Sampler you must iterate `sampler.sounds` and `setDestination` each child.
- `BeatTrack extends Sampler` (`beat-track.ts:54`) — same delegation; no own destination.
- `Font` / `Sprite` — hold internal `SampledNote`/`Sound` children; same child-delegation shape.

## Decision: **(b) add a minimal core global master-destination hook**

Option (a) — "demos call `instance.setDestination(bus.input)`" — is rejected:
1. **Inconsistent surface.** Works for Sound/Track/Oscillator/LayeredSound/GrainPlayer/PolySynth, but Sampler/BeatTrack/Font/Sprite have no top-level setter — you'd have to reach into `.sounds`/child arrays per type. Fragile and type-specific.
2. **Re-adds the plumbing phase 73 just deleted.** Every one of the 24 demos would get per-instance routing calls back — the opposite of the phase-73 win.

Option (b): a **module-level default destination** in core that every constructor reads instead of hardcoding `audioContext.destination`:

```ts
// core: a global "current master destination" (null → real ctx.destination)
export function setMasterDestination(node: AudioNode | null): void
export function getMasterDestination(): AudioNode | null
// in each constructor: this._destination = getMasterDestination() ?? audioContext.destination
```

One call in the docs theme (`setMasterDestination(demoBus.input)`) then routes **every** playable type through the bus with **zero per-demo changes**, regardless of type. Unit-tested (constructor honors the hook; `setDestination` per-instance still overrides).

### This deviates from the plan's "demo util, NOT public library API" line — and adds PUBLIC API to the published `ez-web-audio` package

Per 75-01 Task 1 Step 2(b) this is the sanctioned escape hatch, logged to `M8-QUESTIONS.md` with recommendation **accept** (a master-output hook is genuinely useful public API: sub-mixing, master metering, offline render targets). **BUT** because it commits new public surface on a semver-published npm package, it is surfaced to Seth for a nod before implementation (per the "surface before outward-facing/hard-to-reverse" rule) rather than baked in unilaterally mid-run.

### Constructors to touch (option b)
`base-sound.ts:226`, `layered-sound.ts:72`, `grain-player.ts:113`, `poly-synth.ts:265` — replace `audioContext.destination` with `getMasterDestination() ?? audioContext.destination`. Sampler/BeatTrack/Font/Sprite inherit automatically (their child Sounds/Oscillators read the hook). Add `setMasterDestination`/`getMasterDestination` + `master-destination.ts` module + unit tests + `initAudio` teardown reset.
