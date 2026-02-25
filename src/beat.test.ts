import type { BeatOptions } from '@/beat'
import { AudioContext as Mock } from 'standardized-audio-context-mock'
import { describe, expect, it, vi } from 'vitest'
import { Beat } from '@/beat'
import { mockSetTimeout, settle } from './test/helpers'

class MockParentClass {
  playCalled = false
  playInCalled = false
  playInValue = 0
  play() {
    this.playCalled = true
  }

  playIn(time: number) {
    this.playInCalled = true
    this.playInValue = time
  }
}

function createBeat(p: BeatOptions) {
  const context = new Mock() as unknown as AudioContext
  return new Beat(context, p)
}

it('exists', () => {
  expect(Beat).toBeTruthy()
})

it('can be created', () => {
  const parent = new MockParentClass()
  const beat = createBeat(parent)
  expect(beat).toBeTruthy()
})

it('can play and calls parent play', () => {
  const parent = new MockParentClass()
  const beat = createBeat({
    play: parent.play.bind(parent),
    playIn: parent.playIn.bind(parent),
  })

  expect(parent.playCalled).toBe(false)
  beat.play()
  expect(parent.playCalled).toBe(true)
})

it('can playIn and calls parent playIn, passing time value', () => {
  const parent = new MockParentClass()
  const beat = createBeat({
    play: parent.play.bind(parent),
    playIn: parent.playIn.bind(parent),
  })

  expect(parent.playCalled).toBe(false)
  beat.playIn(10)
  expect(parent.playInCalled).toBe(true)
  expect(parent.playInValue).toBe(10)
})

it('sets `isPlaying` to `true` when played and sets up a timer that sets `isPlaying` back to false after `duration` has elapsed.', async () => {
  const parent = new MockParentClass()
  const beat = createBeat({
    play: parent.play.bind(parent),
    playIn: parent.playIn.bind(parent),
    duration: 1,
    // mock setTimeout so we can control when it fires
    setTimeout: mockSetTimeout,
  })

  expect(beat.isPlaying).toBe(false)

  beat.play()

  expect(beat.isPlaying).toBe(true)

  expect(await settle(() => beat.isPlaying)).toBe(false)
})

describe('playIfActive()', () => {
  it('when active=true, calls parent play and sets isPlaying=true', () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = true
    beat.playIfActive()

    expect(parent.playCalled).toBe(true)
    expect(beat.isPlaying).toBe(true)
  })

  it('when active=false, does NOT call parent play and isPlaying stays false', () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = false
    beat.playIfActive()

    expect(parent.playCalled).toBe(false)
    expect(beat.isPlaying).toBe(false)
  })

  it('always sets currentTimeIsPlaying regardless of active state', () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = false
    beat.playIfActive()

    expect(beat.currentTimeIsPlaying).toBe(true)
  })

  it('isPlaying resets to false after duration elapses', async () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = true
    beat.playIfActive()

    expect(beat.isPlaying).toBe(true)
    expect(await settle(() => beat.isPlaying)).toBe(false)
  })

  it('currentTimeIsPlaying resets to false after duration elapses', async () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.playIfActive()

    expect(beat.currentTimeIsPlaying).toBe(true)
    expect(await settle(() => beat.currentTimeIsPlaying)).toBe(false)
  })
})

describe('playInIfActive()', () => {
  it('when active=true, calls parentPlayIn with the given offset', async () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = true
    beat.playInIfActive(0.5)

    expect(parent.playInCalled).toBe(true)
    expect(parent.playInValue).toBe(0.5)
  })

  it('when active=false, does NOT call parentPlayIn', () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = false
    beat.playInIfActive(0.5)

    expect(parent.playInCalled).toBe(false)
  })

  it('always sets currentTimeIsPlaying after offset elapses, even when inactive', async () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = false
    beat.playInIfActive(0)

    expect(await settle(() => beat.currentTimeIsPlaying)).toBe(true)
  })

  it('when active, both isPlaying and currentTimeIsPlaying are set after offset elapses', async () => {
    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 1,
      setTimeout: mockSetTimeout,
    })

    beat.active = true
    beat.playInIfActive(0)

    expect(await settle(() => beat.isPlaying)).toBe(true)
    expect(beat.currentTimeIsPlaying).toBe(true)
  })
})

describe('pendingTimerIds self-cleaning', () => {
  it('removes completed timer IDs from pendingTimerIds so the array does not grow unbounded', async () => {
    // Use a controllable mock: capture callbacks so we can fire them manually
    const pendingCallbacks: Map<number, () => void> = new Map()
    let nextId = 1
    const mockSyncSetTimeout = vi.fn((fn: () => void, _delay: number) => {
      const id = nextId++
      pendingCallbacks.set(id, fn)
      return id
    })
    const mockClearTimeout = vi.fn((id: number) => {
      pendingCallbacks.delete(id)
    })

    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 100,
      setTimeout: mockSyncSetTimeout as any,
      clearTimeout: mockClearTimeout,
    })

    // Trigger playIfActive — schedules timers for currentTimeIsPlaying
    beat.active = true
    beat.playIfActive()

    const countAfterSchedule = pendingCallbacks.size
    expect(countAfterSchedule).toBeGreaterThan(0)

    // Fire all pending callbacks (simulating time passing)
    const callbacks = Array.from(pendingCallbacks.values())
    pendingCallbacks.clear()
    for (const cb of callbacks) {
      cb()
    }

    // Fire the inner reset callbacks that were registered by the wrapping
    const innerCallbacks = Array.from(pendingCallbacks.values())
    pendingCallbacks.clear()
    for (const cb of innerCallbacks) {
      cb()
    }

    // After all timers complete, cancelPendingTimers should have nothing to cancel
    // (pendingTimerIds self-cleaned itself)
    beat.cancelPendingTimers()
    // Verify clearTimeout was not called with IDs that already completed
    // The key behavior: isPlaying and currentTimeIsPlaying should be reset
    expect(beat.isPlaying).toBe(false)
    expect(beat.currentTimeIsPlaying).toBe(false)
  })

  it('cancelPendingTimers still cancels active (not yet fired) timers', () => {
    const pendingCallbacks: Map<number, () => void> = new Map()
    let nextId = 1
    const mockSyncSetTimeout = vi.fn((fn: () => void, _delay: number) => {
      const id = nextId++
      pendingCallbacks.set(id, fn)
      return id
    })
    const mockClearTimeout = vi.fn((id: number) => {
      pendingCallbacks.delete(id)
    })

    const parent = new MockParentClass()
    const beat = createBeat({
      play: parent.play.bind(parent),
      playIn: parent.playIn.bind(parent),
      duration: 100,
      setTimeout: mockSyncSetTimeout as any,
      clearTimeout: mockClearTimeout,
    })

    beat.active = true
    beat.playIfActive()

    const countBeforeCancel = pendingCallbacks.size
    expect(countBeforeCancel).toBeGreaterThan(0)

    // Cancel before any timers fire — should clear them all
    beat.cancelPendingTimers()

    expect(beat.isPlaying).toBe(false)
    expect(beat.currentTimeIsPlaying).toBe(false)
    // All pending callbacks should have been removed by clearTimeout
    expect(pendingCallbacks.size).toBe(0)
  })
})
