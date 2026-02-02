import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import AudioDemo from './components/AudioDemo.vue'
import OscillatorDemo from './components/OscillatorDemo.vue'
import TrackDemo from './components/TrackDemo.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register components globally for use in markdown
    app.component('AudioDemo', AudioDemo)
    app.component('OscillatorDemo', OscillatorDemo)
    app.component('TrackDemo', TrackDemo)
  }
} satisfies Theme
