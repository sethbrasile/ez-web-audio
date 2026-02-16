# Deferred Items - Phase 15 Test Coverage

## Out of Scope Test Failures (Found during 15-01 execution)

These test failures exist in the codebase but are not related to the current plan execution. They are pre-existing issues.

### src/oscillator.test.ts
- **Test:** "oscillator with ADSR envelope > edge cases > envelope automation is scheduled on play"
- **Error:** `AssertionError: expected "setValueAtTime" to be called at least once`
- **Status:** Pre-existing (file already committed)
- **Note:** Out of scope for 15-01 plan (utility module tests)

### src/sampled-note.test.ts
- **Test:** "SampledNote > name property (computed from letter + accidental) > name for natural note is just the letter"
- **Error:** `expected '' to be 'A'`
- **Status:** Untracked file (not part of current plan)
- **Note:** Out of scope for 15-01 plan (utility module tests)

- **Test:** "SampledNote > name property (computed from letter + accidental) > name for flat includes accidental"
- **Error:** `expected '' to be 'Bb'`
- **Status:** Untracked file (not part of current plan)
- **Note:** Out of scope for 15-01 plan (utility module tests)

- **Test:** "SampledNote > name property (computed from letter + accidental) > name for flat includes accidental (using Db instead of C# as frequency map uses flats)"
- **Error:** `expected '' to be 'Db'`
- **Status:** Untracked file (not part of current plan)
- **Note:** Out of scope for 15-01 plan (utility module tests)

## Action Required
These failures should be addressed in a separate plan or phase focused on fixing existing test failures.
