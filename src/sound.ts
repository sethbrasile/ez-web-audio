import type { TimeObject } from '@utils/create-time-object'
import createTimeObject from '@utils/create-time-object'
import { SoundController } from './controllers/sound-controller'
import { BaseSound } from './base-sound'

/**
 * The Sound class provides the core functionality for
 * interacting with the Web Audio API's AudioContext, and is the base class for
 * all other {{#crossLinkModule "Audio"}}{{/crossLinkModule}} types. It prepares
 * an audio source, provides various methods for interacting with the audio source,
 * creates {{#crossLink "AudioNode"}}AudioNodes{{/crossLink}} from the
 * nodes array, sets up the necessary nodes/routing between them,
 * and provides some methods to {{#crossLink "Playable/play:method"}}{{/crossLink}}
 * and {{#crossLink "Sound/stop:method"}}{{/crossLink}} the audio source.
 *
 * @public
 * @class Sound
 * @implements Playable
 */
export class Sound extends BaseSound {
  public audioSourceNode: AudioBufferSourceNode
  protected controller: SoundController

  constructor(audioContext: AudioContext, private audioBuffer: AudioBuffer, opts?: any) {
    super(audioContext, opts)

    const audioSourceNode = audioContext.createBufferSource()
    audioSourceNode.buffer = audioBuffer

    this.audioSourceNode = audioSourceNode
    this.audioBuffer = audioBuffer
    this.controller = new SoundController(this.audioSourceNode, this.gainNode, this.pannerNode)
  }

  protected setup(): void {
    // Disconnect old source if exists (prevents memory leak from accumulated nodes)
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect()
        this.audioSourceNode.onended = null
      }
      catch {
        // Already disconnected, ignore
      }
    }

    // Create new source node (AudioBufferSourceNode is single-use)
    const audioSourceNode = this.audioContext.createBufferSource()
    audioSourceNode.buffer = this.audioBuffer
    this.audioSourceNode = audioSourceNode

    // Connect source to effect chain (legacy connections still supported)
    this.wireConnections()
    this.controller.setValuesAtTimes()

    // Cleanup after playback ends to free memory
    audioSourceNode.onended = () => {
      try {
        audioSourceNode.disconnect()
        audioSourceNode.onended = null
      }
      catch {
        // Already disconnected
      }
    }
  }

  protected wireConnections(): void {
    // Connect source through legacy connections (if any) to the effect chain input
    // Chain: audioSourceNode -> [legacy connections] -> effectChainInput -> [effects] -> gain -> panner -> destination
    const { connections, effectChainInput, audioSourceNode } = this

    if (connections.length === 0) {
      // No legacy connections: source connects directly to effect chain
      audioSourceNode.connect(effectChainInput)
    }
    else {
      // Legacy connections: source -> connections -> effectChainInput
      const nodes: AudioNode[] = [audioSourceNode]
      for (let i = 0; i < connections.length; i++) {
        nodes.push(connections[i].audioNode)
      }
      nodes.push(effectChainInput)

      // Connect them all together
      for (let i = 0; i < nodes.length - 1; i++) {
        nodes[i].connect(nodes[i + 1])
      }
    }
    // Effect chain is already wired (gain -> panner -> destination) in BaseSound
  }

  public get duration(): TimeObject {
    const buffer = this.audioSourceNode.buffer
    if (buffer === null)
      return createTimeObject(0, 0, 0)
    const { duration } = buffer
    const min = Math.floor(duration / 60)
    const sec = duration % 60
    return createTimeObject(duration, min, sec)
  }
}
