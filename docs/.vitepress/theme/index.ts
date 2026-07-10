import type { Theme } from 'vitepress'
import { getAudioContextSync } from 'ez-web-audio'
import DefaultTheme from 'vitepress/theme'
import { getDemoMasterBus } from './audio/demo-master-bus'

import AudioDemo from './components/AudioDemo.vue'
import AudioSpriteDemo from './components/AudioSpriteDemo.vue'
import CrossfadeDemo from './components/CrossfadeDemo.vue'
import DistortionDemo from './components/DistortionDemo.vue'
import DrumMachine from './components/DrumMachine.vue'
import FilterDemo from './components/FilterDemo.vue'
import LayeredSoundDemo from './components/LayeredSoundDemo.vue'
import OscillatorDemo from './components/OscillatorDemo.vue'
import PianoKeyboard from './components/PianoKeyboard.vue'
import SampledDrumKit from './components/SampledDrumKit.vue'
import SoundfontPiano from './components/SoundfontPiano.vue'
import SynthDrumKit from './components/SynthDrumKit.vue'
import SynthKeyboard from './components/SynthKeyboard.vue'
import TimingDemo from './components/TimingDemo.vue'
import TrackDemo from './components/TrackDemo.vue'
import XYPad from './components/XYPad.vue'
import CustomLayout from './CustomLayout.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: CustomLayout,
  enhanceApp({ app }) {
    // Register components globally for use in markdown
    app.component('AudioDemo', AudioDemo)
    app.component('AudioSpriteDemo', AudioSpriteDemo)
    app.component('CrossfadeDemo', CrossfadeDemo)
    app.component('OscillatorDemo', OscillatorDemo)
    app.component('TrackDemo', TrackDemo)
    app.component('PianoKeyboard', PianoKeyboard)
    app.component('SynthKeyboard', SynthKeyboard)
    app.component('DrumMachine', DrumMachine)
    app.component('XYPad', XYPad)
    app.component('SynthDrumKit', SynthDrumKit)
    app.component('SampledDrumKit', SampledDrumKit)
    app.component('TimingDemo', TimingDemo)
    app.component('DistortionDemo', DistortionDemo)
    app.component('SoundfontPiano', SoundfontPiano)
    app.component('FilterDemo', FilterDemo)
    app.component('LayeredSoundDemo', LayeredSoundDemo)

    // Client-only: on the first user gesture, stand up the demo master bus and
    // route all demo audio through its safety limiter + peak meter. The bus
    // installs itself as the global master destination, so no demo needs
    // per-instance routing. Exposes window.__EZ_DEMO_PEAK__ for the loudness E2E.
    if (typeof window !== 'undefined') {
      const peakHost = window as unknown as { __EZ_DEMO_PEAK__?: () => number }
      peakHost.__EZ_DEMO_PEAK__ = () => 0
      const gestures = ['pointerdown', 'keydown', 'touchstart'] as const
      let done = false

      // Capture-phase + SYNCHRONOUS: the bus must install itself as the master
      // destination before the demo's own (target-phase) handler creates its
      // first instance in the same gesture. getAudioContextSync avoids the async
      // race that would let that first instance bypass the bus.
      function onGesture(): void {
        if (done)
          return
        done = true
        gestures.forEach(g => window.removeEventListener(g, onGesture, true))
        const bus = getDemoMasterBus(getAudioContextSync())
        peakHost.__EZ_DEMO_PEAK__ = () => bus.peak()
      }

      gestures.forEach(g => window.addEventListener(g, onGesture, { capture: true }))
    }
  },
} satisfies Theme
