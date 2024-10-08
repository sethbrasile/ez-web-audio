import { observable, observe, unobserve } from '@nx-js/observer-util'
import { createSound, getAudioContext } from '@/index'
import type { Sound } from '@/sound'

const NAME = 'distortion'
let distortionEnabled = false
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
  const curve = makeDistortionCurve(400)

  distortionEnabled = true

  // lower note's gain because distorted signal has much more apparent volume
  sound.update('gain').to(0.1).from('ratio')

  // Set distortionNode's curve to enable distortion
  const node = sound.getNodeFrom<WaveShaperNode>(NAME)
  if (node) {
    node.curve = curve
  }
}

function removeDistortion(sound: Sound): void {
  distortionEnabled = false

  // raise note's gain because clean signal has much less apparent volume
  sound.update('gain').to(1).from('ratio')

  // Set distortionNode's curve to an empty Float32Array to disable distortion
  const node = sound.getNodeFrom<WaveShaperNode>(NAME)
  if (node) {
    node.curve = new Float32Array()
  }
}

export async function setupDistortablePlayButton(element: HTMLButtonElement): Promise<void> {
  // we placed the note inside an nx-js observable so that we can make UI updates to reflect the state of the note
  sound.note = await createSound('Eb5.mp3')
  const audioNode = (await getAudioContext()).createWaveShaper()
  audioNode.curve = new Float32Array()

  sound.note.addConnection({
    audioNode,
    name: NAME,
  })

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
