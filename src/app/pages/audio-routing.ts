import { setupDistortablePlayButton, setupToggleDistortion } from '@/app/pages/distortable-play-button'
import { codeBlock } from '../utils'

const codeExample = `
import { createSound, getAudioContext, wrapEffect } from 'ez-web-audio'

const sound = await createSound('Eb5.mp3')
const audioContext = await getAudioContext()

let distortionEnabled = false

function makeDistortionCurve(amount: number) {
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

// Create a WaveShaper node and wrap it as an Effect
const waveShaperNode = audioContext.createWaveShaper()
waveShaperNode.curve = new Float32Array()
const distortionEffect = wrapEffect(waveShaperNode)
sound.addEffect(distortionEffect)

function addDistortion() {
  distortionEnabled = true
  sound.update('gain').to(0.1).as('ratio')
  const node = distortionEffect.input as WaveShaperNode
  node.curve = makeDistortionCurve(400)
}

function removeDistortion() {
  distortionEnabled = false
  sound.update('gain').to(1).as('ratio')
  const node = distortionEffect.input as WaveShaperNode
  node.curve = new Float32Array()
}

function toggleDistortion(button) {
  if (distortionEnabled) {
    removeDistortion()
    button.textContent = 'Enable distortion'
  }
  else {
    addDistortion()
    button.textContent = 'Disable distortion'
  }
}

distortionButton.addEventListener('click', toggleDistortion)
`

const Content = {
  setup() {
    setupDistortablePlayButton(document.querySelector<HTMLButtonElement>('#play')!)
    setupToggleDistortion(document.querySelector<HTMLButtonElement>('#toggle')!)
  },
  html: `
<h1>Audio Routing</h1>

<button id="play" type="button">Play</button>
<button id="toggle" type="button" disabled>Toggle Distortion</button>

<p>The signal path in the Web Audio API works by stitching together various audio "nodes." An audio node works just like a guitar pedal: it has an input, it processes the audio, and it has an output.</p>
<p>By default, a Sound instance is routed through these audio nodes:</p>

<ol>
  <li>Source - An audio source (file, oscillator, or microphone input) producing digital audio data.</li>
  <li>Effect Chain - Optional effects (filters, distortion, etc.) added via addEffect().</li>
  <li>Gain - Controls the volume of the audio signal.</li>
  <li>Panner - Controls the stereo pan position (left or right).</li>
  <li>Destination - Routes audio to the user's speakers/headphones.
    The nodes are connected automatically: Source -> [Effects] -> Gain -> Panner -> Destination</li>
</ol>

<p>There are many more AudioNode types provided by the Web Audio API. Take a look at the Web Audio API Documentation to learn about all available AudioNode types.</p>
<p>Use addEffect() to insert custom audio processing nodes into a Sound's effect chain. Use wrapEffect() to wrap any native AudioNode as an Effect.</p>

${codeBlock(codeExample)}
`,
}

export default Content
