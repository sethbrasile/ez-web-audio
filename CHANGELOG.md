# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - Unreleased

### Breaking Changes

#### Method Renames

- **`.from()` renamed to `.as()` on `update().to()` chains**
  ```typescript
  // Before
  sound.update('gain').to(0.5).from('ratio')
  // After
  sound.update('gain').to(0.5).as('ratio')
  ```

- **`.from()` renamed to `.as()` on `seek()` chains**
  ```typescript
  // Before
  track.seek(30).from('seconds')
  // After
  track.seek(30).as('seconds')
  ```

- **`ifActivePlayIn()` renamed to `playInIfActive()`**
  ```typescript
  // Before
  beat.ifActivePlayIn(offset)
  // After
  beat.playInIfActive(offset)
  ```

> **Note:** `onPlayRamp().from()` is unchanged -- it means "from value X" (e.g., `.from(440).to(880).in(1)`).

#### Visibility Changes

- `BaseSound.gainNode` is now `protected` -- use `getGainNode()` for advanced access (e.g., scheduling gain ramps directly)
- `BaseSound.pannerNode` is now `protected`
- `BaseSound.effectChainInput` is now `protected`
- `BaseSound.startOffset` is now `protected` -- use Track's `position` and `seek()` APIs instead

#### Removed APIs

- **Connections API removed** -- `addConnection()`, `removeConnection()`, `getConnection()`, `getNodeFrom()`, and the `connections` array have been removed. Use `addEffect()` / `removeEffect()` / `wrapEffect()` instead.
  ```typescript
  // Before (connections API)
  const gain = audioContext.createGain()
  sound.addConnection({ name: 'myGain', audioNode: gain })
  const node = sound.getNodeFrom<GainNode>('myGain')

  // After (effect API)
  const gain = createGainEffect(audioContext, 0.5)
  sound.addEffect(gain)
  ```

- **`OscillatorOpts` type alias removed** -- use `OscillatorOptions`
- **`OscillatorOptsFilterValues` type alias removed** -- use `OscillatorFilterOptions`
- **`Connectable` interface cleaned** -- deprecated members (`connections`, `addConnection`, `removeConnection`, `getConnection`, `getNodeFrom`) removed

### Migration Guide

1. **Find and replace** `.from('ratio')` with `.as('ratio')`, `.from('percent')` with `.as('percent')`, `.from('seconds')` with `.as('seconds')`, `.from('inverseRatio')` with `.as('inverseRatio')`.
2. **Find and replace** `ifActivePlayIn` with `playInIfActive`.
3. **Replace** direct `.gainNode` access with `.getGainNode()`.
4. **Replace** `addConnection`/`getNodeFrom` patterns with `addEffect`/`wrapEffect`.
5. **Replace** `OscillatorOpts` with `OscillatorOptions` and `OscillatorOptsFilterValues` with `OscillatorFilterOptions`.

### Added

- `getGainNode()` public accessor on BaseSound for controlled access to the GainNode
- Comprehensive JSDoc on all public methods with `@param`, `@returns`, `@throws`, and `@example` tags
