import { observable, observe } from '@nx-js/observer-util'
import type { BeatTrack } from '@/beat-track'
import { type Beat, createBeatTrack } from '@/index'

function loadBeatTrackFor(name: string): Promise<BeatTrack> {
  const urls = [1, 2, 3].map(num => `/ez-web-audio/drum-samples/${name}${num}.wav`)
  // default is 4 beats, but we're going to use 8 beats for this example
  // We're passing createBeatTrack the `observable` function from nx-js. This function will be called on every beat as it is created.
  return createBeatTrack(urls, { name, numBeats: 8, wrapWith: observable })
}

export default {
  async setup() {
    const beatTracks = await Promise.all([
      loadBeatTrackFor('kick'),
      loadBeatTrackFor('snare'),
      loadBeatTrackFor('hihat'),
    ])

    beatTracks.forEach((beatTrack) => {
      const { name } = beatTrack
      // snare and hihat are a little louder than kick, so we'll turn down the gain a bit
      if (name !== 'kick') {
        beatTrack.gain = 0.5
      }
      // and let's pan the hihat a little to the left
      if (name === 'hihat') {
        beatTrack.pan = -0.4
      }

      // get the lane for the beat track
      const lane = document.getElementById(`${name}-lane`)
      // add beat pads to the lane
      beatTrack.beats.forEach((beat) => {
        // create a beat pad
        const beatPad = document.createElement('div')
        beatPad.role = 'button'
        beatPad.classList.add('beat-pad')

        // create a pad to be placed inside the beat pad
        const pad = document.createElement('span')
        pad.classList.add('pad')

        // add the beat pad and pad to the lane
        lane?.appendChild(beatPad)
        beatPad.appendChild(pad)

        // add a click event listener to the beat pad which toggles its active state and plays if active
        beatPad.addEventListener('click', () => {
          beat.active = !beat.active
          beat.playIfActive()
        })

        // Define some potential states that we will bind to the pad's classes with an nx-js observable
        // we're going to represent these states visually in the UI
        const beatStates = new Map<string, keyof Beat>()
        beatStates.set('active', 'active')
        beatStates.set('playing', 'isPlaying')
        beatStates.set('highlighted', 'currentTimeIsPlaying')

        // Since we wrapped each beat with `observable`, we can observe each beat's
        // properties and take action when they change
        beatStates.forEach((state, className) => {
          observe(() => {
            // if this state is true
            if (beat[state]) {
              // then add the class to the pad
              pad.classList.add(className)
            }
            else {
              // otherwise, remove the class from the pad
              pad.classList.remove(className)
            }
          })
        })
      })
    })

    // show the beat machine
    document.getElementById('beat-machine')!.classList.remove('hidden')

    // set up the play button
    const playButton = document.getElementById('play-button')!
    const tempoInput = document.getElementById('tempo-input')! as HTMLInputElement
    playButton.addEventListener('click', () => {
      beatTracks.forEach((beatTrack) => {
        beatTrack.playActiveBeats(tempoInput.valueAsNumber, 1 / 8)
      })
    })
  },
  html: `
<div id="beat-machine" class="beat-machine hidden">
  <div class="controls">
    <button id="play-button">PLAY</button>
    <div class="space">
      <label>Tempo <Input value="120" id="tempo-input" type="number" /></label>
    </div>
  </div>

  <div id="kick-lane" class="lane">
    <p>Kick</p>
  </div>
  <div id="snare-lane" class="lane">
    <p>Snare</p>
  </div>
  <div id="hihat-lane" class="lane">
    <p>HiHat</p>
  </div>
</div>
  `,
  toString() {
    return this.html
  },
}
