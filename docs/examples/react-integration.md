---
title: React Integration - Hooks Pattern with useRef and useEffect
description: "Learn how to integrate ez-web-audio into React applications using idiomatic hooks patterns: useRef for audio instances, useEffect for cleanup, and custom hooks for reusable audio logic."
---

# React Integration: Hooks Pattern

EZ Web Audio is framework-agnostic and works with any frontend framework. This page shows idiomatic React patterns for integrating audio into your components.

## Basic Sound Playback with React

Use `useRef` to hold audio instances — audio objects are mutable and should not be stored in `useState`. Initialize audio in an event handler to satisfy the browser's user-interaction requirement.

```tsx
import { useRef, useState } from 'react'
import { createSound } from 'ez-web-audio'
import type { Sound } from 'ez-web-audio'

function SoundButton() {
  const soundRef = useRef<Sound | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  async function init() {
    soundRef.current = await createSound('/audio/click.mp3')
    setIsLoaded(true)
  }

  return (
    <div>
      {!isLoaded ? (
        <button onClick={init}>Load Sound</button>
      ) : (
        <button onClick={() => soundRef.current?.play()}>Play</button>
      )}
    </div>
  )
}
```

The first click loads and initializes the `AudioContext` (satisfying browser security requirements). Subsequent clicks play the sound immediately.

## Track with Progress Tracking

For music tracks, poll the `position` property with `requestAnimationFrame` inside a `useEffect`. This gives smooth updates without the drift of `setInterval`.

```tsx
import { useRef, useState, useEffect } from 'react'
import { createTrack } from 'ez-web-audio'
import type { Track } from 'ez-web-audio'

function TrackPlayer() {
  const trackRef = useRef<Track | null>(null)
  const [position, setPosition] = useState('0:00')
  const [isPlaying, setIsPlaying] = useState(false)
  const rafRef = useRef<number>(0)

  // Poll position during playback
  useEffect(() => {
    if (!isPlaying || !trackRef.current) return

    function tick() {
      if (trackRef.current) {
        setPosition(trackRef.current.position.string)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying])

  async function init() {
    trackRef.current = await createTrack('/audio/music.mp3')
  }

  async function play() {
    if (!trackRef.current) await init()
    await trackRef.current!.play()
    setIsPlaying(true)
  }

  async function pause() {
    await trackRef.current?.pause()
    setIsPlaying(false)
  }

  async function stop() {
    await trackRef.current?.stop()
    setIsPlaying(false)
    setPosition('0:00')
  }

  return (
    <div>
      <span>{position}</span>
      <button onClick={play}>Play</button>
      <button onClick={pause}>Pause</button>
      <button onClick={stop}>Stop</button>
    </div>
  )
}
```

## Oscillator with Cleanup

Always stop and dispose audio nodes when a component unmounts. The `useEffect` cleanup function is the right place for this.

```tsx
import { useRef, useEffect, useState } from 'react'
import { createOscillator } from 'ez-web-audio'
import type { Oscillator } from 'ez-web-audio'

function Synth() {
  const oscRef = useRef<Oscillator | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      oscRef.current?.stop()
    }
  }, [])

  async function startNote() {
    if (!oscRef.current) {
      oscRef.current = await createOscillator({ frequency: 440, waveType: 'sine' })
    }
    await oscRef.current.play()
    setIsPlaying(true)
  }

  async function stopNote() {
    await oscRef.current?.stop()
    setIsPlaying(false)
  }

  return (
    <button onMouseDown={startNote} onMouseUp={stopNote}>
      {isPlaying ? 'Playing...' : 'Hold to Play'}
    </button>
  )
}
```

## Custom Hook Pattern

Extract reusable audio logic into custom hooks for cleaner components.

```tsx
import { useRef, useState, useCallback, useEffect } from 'react'
import { createSound } from 'ez-web-audio'
import type { Sound } from 'ez-web-audio'

function useSound(url: string) {
  const soundRef = useRef<Sound | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const load = useCallback(async () => {
    soundRef.current = await createSound(url)
    setIsLoaded(true)
  }, [url])

  const play = useCallback(() => soundRef.current?.play(), [])
  const stop = useCallback(() => soundRef.current?.stop(), [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.stop()
    }
  }, [])

  return { load, play, stop, isLoaded }
}

// Usage
function SoundEffect() {
  const { load, play, isLoaded } = useSound('/audio/click.mp3')

  return (
    <div>
      {!isLoaded ? (
        <button onClick={load}>Load</button>
      ) : (
        <button onClick={() => play()}>Play Click</button>
      )}
    </div>
  )
}
```

## Key Principles

- **Use `useRef` for audio instances** — audio objects are mutable and not serializable; storing them in `useState` causes unnecessary re-renders and can break audio context references
- **Initialize audio in event handlers** — the browser requires a user interaction before creating an `AudioContext`; never initialize audio on component mount
- **Clean up with `stop()` in `useEffect` cleanup** — always stop audio when a component unmounts to prevent memory leaks and orphaned audio
- **Poll position with `requestAnimationFrame`** — smoother and more accurate than `setInterval` for animation-rate updates like progress bars
- **Use `useCallback` for stable handler references** — prevents unnecessary re-renders when passing handlers to child components

## Next Steps

- [Core Concepts](/guide/concepts) — Understand the library's architecture
- [Parameter Control](/guide/parameter-control) — Automate gain, frequency, and other parameters
- [Vue Reactive Pattern](/examples/drum-machine-vue) — See the Vue integration approach for comparison
- [Vanilla TS Events](/examples/drum-machine-vanilla) — Framework-free integration pattern
