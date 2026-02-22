---
title: Audio Visualization - Frequency and Waveform Display
description: Visualize audio in real-time with frequency spectrum and waveform displays using the Web Audio AnalyserNode. Canvas-based rendering with customizable FFT size.
---

# Audio Visualization

Visualize audio in real-time using the Analyzer API. This demo shows both frequency spectrum (FFT) and time-domain waveform visualization.

<script setup>
import VisualizationDemo from '../.vitepress/theme/components/VisualizationDemo.vue'
</script>

<VisualizationDemo />

## How It Works

Audio visualization uses the Web Audio API's `AnalyserNode` to extract frequency and waveform data from any audio source. EZ Web Audio provides a simple interface through the `Analyzer` class.

### Frequency Spectrum (FFT)

The frequency spectrum visualization shows the amplitude of different frequencies present in the audio. It uses Fast Fourier Transform (FFT) to convert time-domain audio data into frequency-domain data.

- **Lower frequencies** (left side) represent bass tones
- **Higher frequencies** (right side) represent treble tones
- **Bar height** represents amplitude at that frequency
- **FFT size** controls resolution (more bars = higher detail)

### Time-Domain Waveform

The waveform visualization shows the actual audio signal over time. This is the "raw" audio data before FFT processing.

- **X-axis** represents time
- **Y-axis** represents amplitude
- Different **waveform types** produce distinctive shapes:
  - **Sine**: Smooth wave
  - **Square**: Flat tops and bottoms
  - **Sawtooth**: Sharp, ramp-like pattern
  - **Triangle**: Linear rise and fall

## Code Example

Here's how to set up audio visualization from scratch:

```typescript
import { createAnalyzer, createOscillator, getAudioContext } from 'ez-web-audio'

// Create an audio source (oscillator in this case)
const oscillator = await createOscillator({
  frequency: 440,
  type: 'sine'
})
oscillator.changeGainTo(0.3)

// Create an analyzer with FFT size
const audioContext = await getAudioContext()
const analyzer = createAnalyzer(audioContext, { fftSize: 1024 })

// Connect the oscillator to the analyzer
oscillator.setAnalyzer(analyzer)

// Start playing
oscillator.play()

// Set up canvas
const canvas = document.getElementById('visualizer') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
canvas.width = 800
canvas.height = 200

// Animation loop for frequency spectrum
function drawFrequencySpectrum() {
  const frequencyData = analyzer.getFrequencyData()
  const barWidth = canvas.width / frequencyData.length

  // Clear canvas
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw bars
  for (let i = 0; i < frequencyData.length; i++) {
    const barHeight = (frequencyData[i] / 255) * canvas.height
    const x = i * barWidth
    const y = canvas.height - barHeight

    // Color gradient based on frequency
    const hue = (i / frequencyData.length) * 240
    ctx.fillStyle = `hsl(${240 - hue}, 70%, 50%)`
    ctx.fillRect(x, y, barWidth - 1, barHeight)
  }

  requestAnimationFrame(drawFrequencySpectrum)
}

drawFrequencySpectrum()
```

### Waveform Visualization

```typescript
// Same analyzer from above
function drawWaveform() {
  const waveformData = analyzer.getTimeDomainData()

  // Clear canvas
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw waveform line
  ctx.lineWidth = 2
  ctx.strokeStyle = '#0f0'
  ctx.beginPath()

  const sliceWidth = canvas.width / waveformData.length
  let x = 0

  for (let i = 0; i < waveformData.length; i++) {
    const v = waveformData[i] / 128.0 // Normalize to 0-2
    const y = (v * canvas.height) / 2

    if (i === 0) {
      ctx.moveTo(x, y)
    }
    else {
      ctx.lineTo(x, y)
    }

    x += sliceWidth
  }

  ctx.stroke()
  requestAnimationFrame(drawWaveform)
}

drawWaveform()
```

## Using Analyzer with Different Sound Sources

The analyzer works with any sound type:

```typescript
import { createAnalyzer, createSound, getAudioContext } from 'ez-web-audio'

// Visualize a music track
const track = await createSound('music.mp3')
const audioContext = await getAudioContext()
const analyzer = createAnalyzer(audioContext, { fftSize: 2048 })

track.setAnalyzer(analyzer)
track.play()

// Now use analyzer.getFrequencyData() or analyzer.getTimeDomainData()
// in your animation loop as shown above
```

## FFT Size and Resolution

The FFT size determines the resolution of frequency analysis:

| FFT Size | Frequency Bins | Time Resolution | Best For |
|----------|----------------|-----------------|----------|
| 256 | 128 | Fastest | Simple visualizers, performance-critical |
| 512 | 256 | Fast | Most visualizers |
| 1024 | 512 | Balanced | Detailed frequency analysis |
| 2048 | 1024 | Slower | Maximum detail, music analysis |

Higher FFT sizes provide more frequency detail but update slightly slower. Most visualizations work best with 512-1024.

## API Used

This example demonstrates:

- `createAnalyzer()` - Create an analyzer for audio visualization
- `setAnalyzer()` - Connect a sound to an analyzer
- `getFrequencyData()` - Get frequency spectrum data (0-255 for each frequency bin)
- `getTimeDomainData()` - Get waveform data (0-255 for each time sample)
- Canvas rendering with `requestAnimationFrame()` for smooth animation

## Next Steps

- **[Ambient Generator](/examples/ambient-generator)** - Create layered ambient soundscapes
- **[Effects](/examples/effects)** - Apply filters and see their effect on the spectrum
- **[Synth Keyboard](/examples/synth-keyboard)** - Try different waveforms and envelopes
