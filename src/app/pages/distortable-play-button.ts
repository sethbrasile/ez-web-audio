import type { Effect } from '@/effects/types'
import type { Sound } from '@/sound'
import { observable, observe, unobserve } from '@nx-js/observer-util'
import { createSound, getAudioContext, wrapEffect } from '@/index'

let distortionEnabled = false
let distortionEffect: Effect | undefined
const sound = observable<{ note: Sound | undefined }>({ note: undefined })

function makeDistortionCurve(amount: number): Float32Array {
  // I stole this straight from the Mozilla Web Audio API docs site
  const k = typeof amount === 'number' ? amount : 50
  const n_samples = 44100
  const curve = new Float32Array(n_samples)
  const deg = Math.PI / 180

  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x))
  }

  return curve
}

function addDistortion(sound: Sound): void {
  distortionEnabled = true

  // lower note's gain because distorted signal has much more apparent volume
  sound.update('gain').to(0.1).as('ratio')

  // Enable distortion by setting the curve on the WaveShaper node
  if (distortionEffect) {
    const node = distortionEffect.input as WaveShaperNode
    node.curve = makeDistortionCurve(400)
  }
}

function removeDistortion(sound: Sound): void {
  distortionEnabled = false

  // raise note's gain because clean signal has much less apparent volume
  sound.update('gain').to(1).as('ratio')

  // Disable distortion by clearing the curve
  if (distortionEffect) {
    const node = distortionEffect.input as WaveShaperNode
    node.curve = new Float32Array()
  }
}

export async function setupDistortablePlayButton(element: HTMLButtonElement): Promise<void> {
  // we placed the note inside an nx-js observable so that we can make UI updates to reflect the state of the note
  sound.note = await createSound('Eb5.mp3')
  const audioContext = await getAudioContext()
  const waveShaperNode = audioContext.createWaveShaper()
  waveShaperNode.curve = new Float32Array()

  // Wrap the WaveShaper node as an Effect and add it to the sound's effect chain
  distortionEffect = wrapEffect(waveShaperNode)
  sound.note.addEffect(distortionEffect)

  if (sound.note) {
    element.addEventListener('click', () => {
      sound.note?.play()
    })
  }
}

export function setupToggleDistortion(element: HTMLButtonElement): void {
  function toggleDistortion(): void {
    if (distortionEnabled) {
      removeDistortion(sound.note!)
      element.textContent = 'Enable distortion'
    }
    else {
      addDistortion(sound.note!)
      element.textContent = 'Disable distortion'
    }
  }

  function enableDistortionButton(): void {
    if (sound.note) {
      element.disabled = false
      unobserve(enableDistortionButton)
    }
  }

  observe(enableDistortionButton)

  element.addEventListener('click', toggleDistortion)
}
