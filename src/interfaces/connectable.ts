import type { ControlType, RatioType } from '@controllers/base-param-controller'

/**
 * A named audio node connection for legacy routing.
 *
 * @deprecated Use the Effect interface with addEffect() instead.
 */
export interface Connection { audioNode: AudioNode, name: string }

/**
 * Interface for audio sources that can be routed through connection chains.
 *
 * Provides gain/pan control and audio node management.
 *
 * @deprecated The connections-based routing is superseded by the Effect system (addEffect/removeEffect).
 */
export interface Connectable {
  connections: Connection[]
  percentGain: number
  audioSourceNode: AudioNode
  getNodeFrom: (name: string) => AudioNode | undefined
  addConnection: (connection: Connection, name: string) => this
  removeConnection: (name: string) => this
  getConnection: (name: string) => Connection | undefined
  changePanTo: (value: number) => this
  changeGainTo: (value: number) => this
  update: (type: ControlType, value: number) => {
    to: (value: number) => {
      as: (method: RatioType) => void
    }
  }
}
