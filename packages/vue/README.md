# @ez-web-audio/vue

Vue 3 composables for [ez-web-audio](https://sethbrasile.github.io/ez-web-audio) — reactive wrappers around the core library.

Every core factory gets a composable with a uniform shape — `{ instance, loading, error, load }` — plus `useCleanup()` for automatic disposal on unmount and `useAudioContext()` for init state. Nothing touches an `AudioContext` until you call `load()`/`init()` from a user gesture, so components are SSR-safe by construction.

```
npm install @ez-web-audio/vue   # coming in 0.2.0
```

## Usage

```vue
<script setup lang="ts">
import { useCleanup, useOscillator } from '@ez-web-audio/vue'

const { instance: osc, loading, error, load } = useOscillator()
const { register } = useCleanup()

// First user interaction initializes audio — no separate "load" button.
async function toggle(): Promise<void> {
  if (!osc.value) {
    register(await load({ frequency: 220, type: 'sawtooth' }))
    osc.value!.play()
    return
  }
  osc.value.isPlaying ? osc.value.stop() : osc.value.play()
}
</script>

<template>
  <button :disabled="loading" @click="toggle">
    {{ loading ? 'Starting…' : osc?.isPlaying ? 'Stop' : 'Play' }}
  </button>
  <p v-if="error" role="alert">
    {{ error.message }}
  </p>
</template>
```

`useCleanup().register(obj)` returns its argument and guarantees `stop()` then `dispose()` when the component unmounts — even if another registered object throws during cleanup.

## Composables

| Composable | Wraps |
|---|---|
| `useSound` | `createSound` |
| `useTrack` | `createTrack` |
| `useOscillator` | `createOscillator` |
| `useSampler` | `createSampler` |
| `usePolySynth` | `createPolySynth` |
| `useGrainPlayer` | `createGrainPlayer` |
| `useLFO` | `createLFO` |
| `useTransport` | `createTransport` |
| `useBeatTrack` | `createBeatTrack` (+ injects `wrapWith: reactive` so `Beat` state is reactive in templates; pass your own `wrapWith` to override) |
| `useAudioContext` | `initAudio` — `{ ready, init }` |
| `useCleanup` | disposal on unmount — `{ register, disposeAll }` |

`createFactoryComposable` is also exported for wrapping custom async factories with the same shape.
