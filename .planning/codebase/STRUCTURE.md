# Codebase Structure

**Analysis Date:** 2026-01-31

## Directory Layout

```
ez-audio/
├── src/
│   ├── index.ts                 # Public API: factory functions, AudioContext management
│   ├── base-sound.ts            # Abstract base class for all sound types
│   ├── sound.ts                 # One-shot audio playback from AudioBuffer
│   ├── track.ts                 # Music track with position tracking, pause/resume
│   ├── oscillator.ts            # Synthesizer with filters
│   ├── sampler.ts               # Round-robin playback of multiple sounds
│   ├── beat-track.ts            # Drum machine lane with Beat patterns
│   ├── beat.ts                  # Single rhythmic position (active or rest)
│   ├── sampled-note.ts          # Note with audio + musical identity
│   ├── note.ts                  # Note data structure without audio
│   ├── musical-identity.ts      # Mixin for musical note properties
│   ├── font.ts                  # Collection of SampledNote instances
│   ├── layered-sound.ts         # (Not yet analyzed)
│   ├── vite-env.d.ts            # Vite environment type declarations
│   ├── controllers/             # Parameter management and scheduling
│   │   ├── base-param-controller.ts
│   │   ├── sound-controller.ts
│   │   └── oscillator-controller.ts
│   ├── interfaces/              # Type contracts
│   │   ├── playable.ts          # Playable contract (play/stop)
│   │   └── connectable.ts       # Connectable contract (routing/parameters)
│   ├── utils/                   # Helper functions and data
│   │   ├── frequency-map.ts     # Piano key frequencies
│   │   ├── note-methods.ts      # Note parsing and identification
│   │   ├── decode-base64.ts     # Sound font decoding
│   │   ├── create-time-object.ts # TimeObject creation
│   │   ├── timeout.ts           # AudioContext-aware setTimeout
│   │   ├── prop-access.ts       # Nested object property access
│   │   ├── array-methods.ts     # Array utility methods
│   │   ├── exponential-ratio.ts # Math utility
│   │   ├── within-range.ts      # Range validation
│   │   ├── zeroify.ts           # Zero conversion utility
│   │   ├── unmute.js            # iOS audio unlock workaround
│   │   ├── *.test.ts            # Utility tests
│   ├── app/                     # Documentation/example application (NOT part of library)
│   │   ├── main.ts              # App entry point
│   │   ├── router.ts            # Page routing
│   │   ├── components/          # UI components
│   │   ├── pages/               # Application pages (demos)
│   │   ├── utils/               # App-specific utilities
│   │   └── public/              # Static assets
│   └── test/                    # Test utilities and helpers
│       └── helpers/             # Test factories and setup
├── dist/                        # Built library (generated)
├── dist-app/                    # Built application (generated)
├── docs/                        # Generated documentation
├── .planning/                   # GSD planning directory
├── .grepai/                     # Grep AI cache
├── tsconfig.json                # TypeScript configuration
├── vite.config.js               # Vite build config for library
├── vite.docs.config.js          # Vite config for docs app
├── package.json                 # Dependencies and scripts
├── pnpm-lock.yaml               # Lockfile
├── eslint.config.js             # Linting configuration
├── readme.md                    # Project overview
└── CLAUDE.md                    # Developer instructions
```

## Directory Purposes

**src/:**
- Purpose: All TypeScript source code (library + documentation app)
- Contains: Core library code, controllers, utilities, example app
- Key files: `index.ts` (public API), `base-sound.ts` (base class hierarchy)

**src/controllers/:**
- Purpose: Parameter management and Web Audio scheduling
- Contains: Controllers for managing gain, pan, frequency, detune with fluent API
- Key files: `base-param-controller.ts` (base implementation), `sound-controller.ts` (for buffered audio), `oscillator-controller.ts` (for oscillators)

**src/interfaces/:**
- Purpose: TypeScript interface contracts
- Contains: Playable (play/stop contract), Connectable (routing/parameters contract)
- Key files: `playable.ts`, `connectable.ts`

**src/utils/:**
- Purpose: Standalone utility functions and data
- Contains: Frequency lookups, time formatting, audio decoding, math helpers
- Key files: `frequency-map.ts` (piano frequencies), `timeout.ts` (AudioContext-aware delays), `decode-base64.ts` (sound font parsing)

**src/app/:**
- Purpose: Documentation and example application (NOT library code)
- Contains: UI components, demo pages, routing, static assets
- Key files: `main.ts` (app entry), `router.ts` (page routing)
- Note: Separate from library - can be excluded from library bundle

**src/test/:**
- Purpose: Shared test utilities
- Contains: Test factories, mock setup helpers
- Key files: `helpers/note-factory.ts` (creates test notes)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Public API, factory functions for creating sounds, audio context initialization
- `src/app/main.ts`: Documentation app entry point
- `src/app/router.ts`: Application page routing

**Configuration:**
- `tsconfig.json`: TypeScript compiler options, path aliases
- `vite.config.js`: Library build configuration
- `vite.docs.config.js`: Documentation app build configuration
- `eslint.config.js`: Linting rules

**Core Library Logic:**
- `src/base-sound.ts`: Abstract base class with play/stop/timing methods
- `src/sound.ts`: One-shot audio buffer playback
- `src/track.ts`: Music track with position tracking
- `src/oscillator.ts`: Synthesizer with filters
- `src/sampler.ts`: Round-robin sample playback
- `src/beat-track.ts`: Drum machine pattern container
- `src/musical-identity.ts`: Mixin for musical note properties
- `src/font.ts`: Sound font note collection

**Controllers (Parameter Management):**
- `src/controllers/base-param-controller.ts`: Base controller with parameter scheduling
- `src/controllers/sound-controller.ts`: Controller for AudioBufferSourceNode
- `src/controllers/oscillator-controller.ts`: Controller for OscillatorNode

**Utilities:**
- `src/utils/frequency-map.ts`: Piano key frequency lookup table
- `src/utils/note-methods.ts`: Note parsing and musical identity computation
- `src/utils/decode-base64.ts`: Sound font base64 decoding
- `src/utils/timeout.ts`: AudioContext-aware setTimeout wrapper
- `src/utils/create-time-object.ts`: TimeObject creation utility

**Testing:**
- `src/utils/array-methods.test.ts`: Tests for array utilities
- `src/utils/exponential-ratio.test.ts`: Tests for math utilities
- `src/utils/note-methods.test.ts`: Tests for note parsing
- `src/utils/decode-base64.test.ts`: Tests for sound font decoding
- `src/utils/within-range.test.ts`: Tests for range validation
- `src/utils/zeroify.test.ts`: Tests for zero conversion
- `src/musical-identity.test.ts`: Tests for MusicallyAware mixin

## Naming Conventions

**Files:**
- **Core classes:** PascalCase, single concept per file (e.g., `sound.ts`, `beat-track.ts`)
- **Test files:** Co-located with source, `.test.ts` suffix (e.g., `array-methods.test.ts`)
- **Utilities:** kebab-case if multi-word (e.g., `create-time-object.ts`, `decode-base64.ts`)
- **Interfaces:** descriptor-focused (e.g., `playable.ts`, `connectable.ts`)
- **Controllers:** descriptive + `-controller` suffix (e.g., `sound-controller.ts`)

**Directories:**
- **Feature/layer dirs:** kebab-case, plural for collections (e.g., `controllers/`, `utils/`, `components/`)
- **Page dirs:** kebab-case describing feature (e.g., `audio-files/`, `sound-fonts/`, `synthesis/`)

**Classes:**
- **Abstract classes:** Prefix with `Base` (e.g., `BaseSound`, `BaseParamController`)
- **Concrete implementations:** Descriptive names (e.g., `Sound`, `Track`, `Oscillator`, `SoundController`)
- **Mixins:** Verb form describing added capability (e.g., `MusicallyAware`)

**Functions:**
- **Factory functions:** `create{Type}` pattern (e.g., `createSound()`, `createOscillator()`, `createBeatTrack()`)
- **Utilities:** Verb-based descriptors (e.g., `mungeSoundFont()`, `extractDecodedKeyValuePairs()`, `sortNotes()`)
- **Getters:** Property names without prefix (e.g., `duration`, `position`, `isPlaying`)

**Variables:**
- **AudioContext nodes:** Descriptive names ending in `Node` (e.g., `audioSourceNode`, `gainNode`, `pannerNode`)
- **Queues:** Plural, descriptive (e.g., `startingValues`, `valuesAtTime`, `exponentialValues`)
- **Private fields:** Prefix with underscore (e.g., `_isPlaying`, `_playing`)

## Where to Add New Code

**New Sound Type (e.g., Granular Synth):**
- Primary code: `src/granular-synth.ts` extending `BaseSound`
- Controller: `src/controllers/granular-synth-controller.ts` extending `BaseParamController`
- Factory function: Add `export async function createGranularSynth(options?: GranularSynthOpts): Promise<GranularSynth>` to `src/index.ts`
- Tests: Co-locate as `src/granular-synth.test.ts`

**New Utility Function:**
- Small helpers: Add to existing `src/utils/file-name.ts` file if related
- Standalone complex utility: Create `src/utils/new-utility-name.ts`
- Tests: Create parallel `src/utils/new-utility-name.test.ts`

**New Demo/Example Page:**
- Create directory: `src/app/pages/feature-name/`
- Main component: `src/app/pages/feature-name/index.ts`
- Sub-components: `src/app/pages/feature-name/component-name.ts`
- Register in: `src/app/router.ts` and `src/app/pages/index.ts`

**New UI Component (shared):**
- Location: `src/app/components/component-name/index.ts`
- Related files in same directory: styles, utilities, sub-components
- Export from: `src/app/components/component-name/index.ts`

**New Interface/Contract:**
- Location: `src/interfaces/interface-name.ts`
- Export from: `src/index.ts` if part of public API, otherwise keep internal

## Special Directories

**dist/:**
- Purpose: Built library JavaScript and type declarations
- Generated: Yes (via `pnpm build:lib`)
- Committed: No (in .gitignore)
- Files: JavaScript, .d.ts type declaration files, source maps

**dist-app/:**
- Purpose: Built documentation/example application
- Generated: Yes (via `pnpm build`)
- Committed: No (in .gitignore)
- Files: HTML, CSS, JavaScript bundles

**docs/:**
- Purpose: Generated HTML documentation from TypeDoc
- Generated: Yes (via `pnpm build`)
- Committed: No (in .gitignore)

**src/app/public/:**
- Purpose: Static assets for documentation app
- Generated: No
- Committed: Yes
- Contents: Audio samples (drum-samples/), images, other static files

**src/test/helpers/:**
- Purpose: Shared test utilities and factories
- Generated: No
- Committed: Yes
- Used by: All test files via imports

**Path Aliases (tsconfig.json):**
- `@/*`: `src/*` - any library code
- `@app/*`: `src/app/*` - application-specific code
- `@common/*`: `src/common/*` - shared non-audio code (currently unused)
- `@controllers/*`: `src/controllers/*` - parameter controllers
- `@components/*`: `src/app/components/*` - UI components
- `@utils/*`: `src/utils/*` - utility functions
- `@interfaces/*`: `src/interfaces/*` - type contracts
- `@test/*`: `src/test/*` - test utilities
