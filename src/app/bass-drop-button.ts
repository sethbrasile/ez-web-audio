import AudioService from '../audio-service'

export function setupBassDropButton(element: HTMLButtonElement) {
  const setup = async () => {
    // AudioContext setup must occurr in response to user interaction, so this is why we do setup in click handler
    // then remove the listener.

    const audioService = AudioService.instance
    const drop = audioService.createOscillator('kick')
    drop.onPlayRamp('frequency').from(100).to(0.01).in(20)
    drop.onPlayRamp('gain', 'linear').from(1).to(0.01).in(4)

    // This plays the note upon first user interaction
    drop.play()

    // remove the setup listener
    element.removeEventListener('click', setup)

    // add a listener to play the note again when the button is clicked for the rest of the document's life
    element.addEventListener('click', () => {
      drop.play()
    })
  }

  element.addEventListener('click', setup)
}
