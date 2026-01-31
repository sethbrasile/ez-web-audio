# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**Web Audio API:**
- Native browser API - All audio synthesis, playback, and effects
  - Client: Built into browser (`AudioContext`, `AudioNode`, etc.)
  - No external SDK required

**Fetch API:**
- Used to load audio files and sound fonts from URLs
  - Location: `src/index.ts` (`load()`, `createSound()`, `createTrack()`, `createBeatTrack()`)
  - Purpose: Downloads MP3/WAV/FLAC files and sound font files for decoding

## Data Storage

**Databases:**
- None used - Library is audio processing only, no persistent storage

**File Storage:**
- Local filesystem only during development
- Relies on browser fetch to load remote audio files at runtime
- Sound font data loaded via fetch: `createFont()` in `src/index.ts` line 112-120

**Caching:**
- In-memory response cache
  - Location: `src/index.ts` line 24: `const responses = new Map<string, Response>()`
  - Strategy: Stores fetched audio responses to avoid re-downloading same audio file
  - Used by: `load()` function to check if URL has been fetched before

## Authentication & Identity

**Auth Provider:**
- None - This is a library with no authentication mechanism
- Uses no user/identity system
- Browser's CORS policy is the only security boundary for audio file loading

## Monitoring & Observability

**Error Tracking:**
- None detected - No integration with Sentry, LogRocket, etc.

**Logs:**
- Console logging only (implicit via browser console)
- No structured logging framework

**Browser Requirements:**
- iOS audio unlock workaround: `src/utils/unmute.ts`
  - Handles iOS audio context suspend state
  - Automatically triggered on user interaction in `initAudio()` (line 59-61)

## CI/CD & Deployment

**Hosting:**
- NPM package registry (`ez-web-audio`)
- GitHub repository: https://github.com/sethbrasile/ez-web-audio.git

**CI Pipeline:**
- dotenvx for environment variable injection
- Build output: Library (dist/) + Documentation site (dist-app/) + API docs (docs/)

**Build Commands:**
- `pnpm build:ci` - CI-specific build with `.env.ci`
- `pnpm build` - Local build with `.env.local`

## Environment Configuration

**Required env vars:**
- `VITE_DOCS_URL` - Base URL for TypeDoc hosted documentation
  - Default (local): `http://localhost:5173/ez-web-audio/docs`
  - Used by: `typedoc.config.mjs` line 8

**Secrets location:**
- Not applicable - No API keys, tokens, or secrets required
- Library operates entirely in browser context with no backend

## Webhooks & Callbacks

**Incoming:**
- None - Library receives no incoming webhooks

**Outgoing:**
- None - Library sends no outgoing webhooks

## Audio File Support

**Formats Supported:**
- MP3, WAV, FLAC (via browser's `AudioContext.decodeAudioData()`)
- Sound font format (base64-encoded): Parsed in `src/utils/decode-base64.ts`
  - Location: `createFont()` in `src/index.ts` processes sound fonts

**Sound Font Loading:**
- Location: `src/font.ts` and `src/utils/decode-base64.ts`
- Process:
  1. Fetch sound font file via URL
  2. Extract base64 data
  3. Decode using `extractDecodedKeyValuePairs()` (line 117)
  4. Create note objects via `createNoteObjectsForFont()` (line 118)

## Browser APIs Used

**Critical:**
- `AudioContext` - Core Web Audio API initialization and global context
- `AudioBuffer` - Store decoded audio data
- `AudioNode` (various types):
  - `AudioBufferSourceNode` - Play decoded audio
  - `OscillatorNode` - Generate tones via synthesis
  - `GainNode` - Volume control
  - `StereoPannerNode` - Stereo panning
  - `ConvolverNode` - Effects (via custom `connections` array)
  - `BiquadFilterNode` - Filtering (via oscillator filters)

**Supporting:**
- `fetch()` API - Load audio files and sound fonts
- `document.addEventListener()` - User interaction detection for audio unlock
- `setTimeout()` - AudioContext-aware timer (custom implementation in `src/utils/timeout.ts`)

## Testing Integrations

**Mock AudioContext:**
- `standardized-audio-context-mock 9.7.9`
  - Location: Test files (`*.test.ts`) import `AudioContext as Mock`
  - Examples: `src/sound.test.ts` line 2, `src/beat-track.test.ts` line 2
  - Provides mock AudioContext for Vitest environment

**Test Environment:**
- happy-dom 15.7.4 - Lightweight DOM implementation for tests
  - Configured in `vite.config.js` line 12-14

---

*Integration audit: 2026-01-31*
