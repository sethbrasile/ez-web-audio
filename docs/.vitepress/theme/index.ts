import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import AudioDemo from './components/AudioDemo.vue'
import DistortionDemo from './components/DistortionDemo.vue'
import DrumMachine from './components/DrumMachine.vue'
import FilterDemo from './components/FilterDemo.vue'
import OscillatorDemo from './components/OscillatorDemo.vue'
import PianoKeyboard from './components/PianoKeyboard.vue'
import SampledDrumKit from './components/SampledDrumKit.vue'
import SoundfontPiano from './components/SoundfontPiano.vue'
import SynthDrumKit from './components/SynthDrumKit.vue'
import SynthKeyboard from './components/SynthKeyboard.vue'
import TimingDemo from './components/TimingDemo.vue'
import TrackDemo from './components/TrackDemo.vue'
import XYPad from './components/XYPad.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register components globally for use in markdown
    app.component('AudioDemo', AudioDemo)
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
  },
} satisfies Theme
