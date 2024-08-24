import { removeValue } from './utils'

export interface NodeAttributes {
  attrNameOnNode: string
  relativePath: string
  value?: any
}

interface NodeAttributesOptions {
  key: string
  value: number
  startTime?: number
  endTime?: number
}

type CreateCommand = 'createBuffer' | 'createBufferSource' | 'createGain' | 'createDelay' | 'createBiquadFilter' | 'createWaveShaper' | 'createPanner' | 'createStereoPanner' | 'createAnalyser' | ''

interface ConnectionOptions {
  name: string
  createdOnPlay?: boolean
  createCommand?: CreateCommand
  source?: 'audioContext'
  path?: 'audioContext.destination'
  audioContext?: AudioContext
  destination?: AudioNode
  node?: AudioNode
  nodeAttributes?: NodeAttributes[]
  onPlaySetAttrsOnNode?: NodeAttributes[]
  exponentialRampToValuesAtTime?: NodeAttributesOptions[]
  linearRampToValuesAtTime?: NodeAttributesOptions[]
  setValuesAtTime?: NodeAttributesOptions[]
  startingValues?: NodeAttributesOptions[]
}

/**
 * This class represents a single connection in a Sound instance's connections
 * array. It is mostly just a wrapper around an AudioNode instance. It defines
 * some standards for how to handle the behaviors of different AudioNode types.
 * Most connections create their corresponding AudioNode immediately, but some
 * AudioNodes are "throw-away" and have to be created each time a Sound instance
 * is played.
 *
 * Most properties in this class just define how to go about getting/creating an
 * AudioNode instance and setting it on this class' `node` property. Some define
 * how to set properties on the AudioNode instance after it has been created.
 *
 * @public
 * @class Connection
 */
class Connection {
  constructor(opts: ConnectionOptions, node?: AudioNode) {
    this.name = opts.name || ''
    this.createdOnPlay = opts.createdOnPlay || false
    this.createCommand = opts.createCommand || ''
    this.source = opts.source || ''
    this.path = opts.path || ''

    this.onPlaySetAttrsOnNode = opts.onPlaySetAttrsOnNode || []
    this.exponentialRampToValuesAtTime = opts.exponentialRampToValuesAtTime || []
    this.linearRampToValuesAtTime = opts.linearRampToValuesAtTime || []
    this.setValuesAtTime = opts.setValuesAtTime || []
    this.startingValues = opts.startingValues || []

    if (node) {
      this.node = node
    }
  }

  /**
   * The name of the connection. This is the name that can be used to
   * get an AudioNode instance via the
   * {{#crossLink "Connectable/getNodeFrom:method"}}{{/crossLink}} method, or a
   * Connection instance via the
   * {{#crossLink "Connectable/getConnection"}}{{/crossLink}} method.
   *
   * @public
   * @property name
   */
  name: string

  /**
   * If an AudioNode instance already exists and is accessible to the Sound
   * instance, the path to the node can be placed here. If this value is
   * specified, all options except `name` become useless. If `node` is specified,
   * it will override this option and the AudioNode supplied to `node` will be
   * used.
   *
   * @example
   *     // Uses the Audio Node instance from:
   *     // soundInstance.get('audioContext.destination')
   *     {
   *       name: 'destination',
   *       path: 'audioContext.destination'
   *     }
   *
   * @public
   * @property path
   */
  path: 'audioContext.destination' | ''

  /**
   * If `createCommand` is specified, the object at this location (relative to
   * the Sound instance) will be used as the "source" of the `createCommand`.
   *
   * @example
   *     // Creates the AudioNode by calling:
   *     // this.get('audioContext')[createCommand]();
   *     {
   *       source: 'audioContext'
   *       createCommand: createGain
   *     }
   *
   * @public
   * @property source
   */
  source: 'audioContext' | ''

  /**
   * If `source` is specified, this method will be called on the object that was
   * retrieved from `source`. The value returned from this method is set on the
   * `node` property.
   *
   * @example
   *     // results in the `node` property being created like:
   *     // this.get('audioContext').createGain();
   *     {
   *       source: 'audioContext'
   *       createCommand: 'createGain'
   *     }
   *
   * @public
   * @property createCommand
   */
  createCommand: CreateCommand

  /**
   * An array of NodeAttributes objects that specify properties that need to be set on a node
   * when any of the {{#crossLink "Playable/play:method"}}{{/crossLink}} methods
   * are called. For instance, an
   * {{#crossLink "AudioBufferSourceNode"}}{{/crossLink}} must be created at
   * play time, because they can only be played once and then they are
   * immediately thrown away.
   *
   * Valid keys are:
   *
   * `attrNameOnNode` {string} Determines which property on the node should be
   * set to the value. This can be a nested accessor (ie. `'gain.value'`).
   *
   * `relativePath` {string} Determines where on `this` (the Sound instance) to
   * get the value. This can be a nested accessor (ie. `'gainNode.gain.value'`).
   *
   * `value` {mixed} The direct value to set. If used along with `relativePath`,
   * this will act as a default value and the value at `relativePath` will take
   * precedence.
   *
   * @example
   *     // Causes gainNode.gain.value = soundInstance.get('gainValue') || 1;
   *     // to be called at play-time
   *
   *     {
   *       name: 'gainNode',
   *       onPlaySetAttrsOnNode: [
   *         {
   *           attrNameOnNode: 'gain.value',
   *           relativePath: 'gainValue',
   *           value: 1
   *         }
   *       ]
   *     }
   *
   * @public
   * @property onPlaySetAttrsOnNode
   */
  onPlaySetAttrsOnNode: NodeAttributes[]

  /**
   * Items in this array are set at play-time on the `node` via an exponential
   * ramp that ends at the specified time.
   *
   * A convenience setter method called
   * {{#crossLink "Connection/onPlaySet:method"}}{{/crossLink}} exists for this
   * array and should be used unless it does not allow enough freedom for your
   * use-case.
   *
   * @example
   *     // at play time: connection.node.gain.exponentialRampToValueAtTime(0.1, 1)
   *     {
   *       key: 'gain',
   *       value: 0.1,
   *       endTime: 1
   *     }
   *     // the same thing can be accomplished like:
   *     connection.onPlaySet('gain').to(0.1).endingAt(1)
   *
   * @public
   * @property exponentialRampToValuesAtTime
   * @type {Array}
   */
  exponentialRampToValuesAtTime: NodeAttributesOptions[]

  /**
   * Items in this array are set at play-time on the `node` via a linear ramp
   * that ends at the specified time.
   *
   * A convenience setter method called
   * {{#crossLink "Connection/onPlaySet:method"}}{{/crossLink}} exists for this
   * array and should be used unless it does not allow enough freedom for your
   * use-case.
   *
   * @example
   *     // at play time: connection.node.gain.linearRampToValueAtTime(0.1, 1)
   *     {
   *       key: 'gain',
   *       value: 0.1,
   *       endTime: 1
   *     }
   *     // the same thing can be accomplished like:
   *     connection.onPlaySet('gain').to(0.1).endingAt(1, 'linear')
   *
   * @public
   * @property linearRampToValuesAtTime
   * @type {Array}
   */
  linearRampToValuesAtTime: NodeAttributesOptions[]

  /**
   * Items in this array are set at play-time on the `node` via an exponential
   * ramp that ends at the specified time.
   *
   * A convenience setter method called
   * {{#crossLink "Connection/onPlaySet:method"}}{{/crossLink}} exists for this
   * array and should be used unless it does not allow enough freedom for your
   * use-case.
   *
   * @example
   *     // at play time: connection.node.gain.setValueAtTime(0.1, 1)
   *     {
   *       key: 'gain',
   *       value: 0.1,
   *       startTime: 1
   *     }
   *     // the same thing can be accomplished like:
   *     connection.onPlaySet('gain').to(0.1).at(1)
   *
   * @public
   * @property setValuesAtTime
   * @type {Array}
   */
  setValuesAtTime: NodeAttributesOptions[]

  /**
   * Items in this array are set immediately at play-time on the `node`.
   *
   * A convenience setter method called
   * {{#crossLink "Connection/onPlaySet:method"}}{{/crossLink}} exists for this
   * array and should be used unless it does not allow enough freedom for your
   * use-case.
   *
   * @example
   *     // at play time: connection.node.gain.setValueAtTime(0.1, audioContext.currentTime)
   *     {
   *       key: 'gain',
   *       value: 0.1
   *     }
   *     // the same thing can be accomplished like:
   *     connection.onPlaySet('gain').to(0.1)
   *
   * @public
   * @property startingValues
   * @type {Array}
   */
  startingValues: NodeAttributesOptions[]

  /**
   * This is the main attraction here in connection-land. All the other
   * properties in the Connection class exist to create or mutate this property.
   * Houses an AudioNode instance that will be used by an instance of the Sound
   * class.
   *
   * If this property is set directly, all of the other properties on this class
   * (except `name`) are rendered useless.
   *
   * @public
   * @property node
   * @type {AudioNode}
   */
  node: AudioNode | undefined

  /**
   * If this is true, the AudioNode will be created every time the consuming
   * Sound instance is played.
   *
   * @public
   * @property createdOnPlay
   * @type {boolean}
   * @default false
   */
  createdOnPlay = false

  /**
   * Allows an AudioNode's values to be set at a specific time
   * relative to the moment that it is played, every time it is played.
   *
   * Especially useful for creating/shaping an "envelope" (think "ADSR").
   *
   * @example
   *     // results in an oscillator that starts at 150Hz and quickly drops
   *     // down to 0.01Hz each time it's played
   *     const kick = audio.createOscillator({ name: 'kick' });
   *     const osc = kick.getConnection('audioSource');
   *
   *     osc.onPlaySet('frequency').to(150).at(0);
   *     osc.onPlaySet('frequency').to(0.01).at(0.1);
   *
   * @public
   * @method onPlaySet
   * @todo document 'exponential' and 'linear' options
   */
  onPlaySet(key: string) {
    const exponentialValues = this.exponentialRampToValuesAtTime
    const linearValues = this.linearRampToValuesAtTime
    const valuesAtTime = this.setValuesAtTime
    let startingValues = this.startingValues

    return {
      to(value: number) {
        const startValue = { key, value }

        startingValues.push(startValue)

        return {
          at(startTime: number) {
            startingValues = removeValue(startingValues, startValue)
            valuesAtTime.push({ key, value, startTime })
          },
          endingAt(endTime: number, type: 'exponential' | 'linear' = 'exponential') {
            startingValues = removeValue(startingValues, startValue)

            switch (type) {
              case 'exponential':
                exponentialValues.push({ key, value, endTime })
                break
              case 'linear':
                linearValues.push({ key, value, endTime })
                break
              default:
                throw new Error(
                  `Invalid ramp type: ${type}. Must be 'exponential' or 'linear'`,
                )
            }
          },
        }
      },
    }
  }

  /**
   * Convenience method that uses
   * {{#crossLink "Connection/onPlaySet:method"}}{{/crossLink}} twice to set an
   * initial value, and a ramped value in succession.
   *
   * Especially useful for creating/shaping an "envelope" (think "ADSR").
   *
   * @example
   *     // results in an oscillator that starts at 150Hz and quickly drops
   *     // down to 0.01Hz each time it's played
   *     const kick = audio.createOscillator({ name: 'kick' });
   *     const osc = kick.getConnection('audioSource');
   *
   *     osc.onPlayRamp('frequency').from(150).to(0.01).in(0.1);
   *
   * @public
   * @method onPlaySet
   */
  onPlayRamp(key: string) {
    const onPlaySet = this.onPlaySet.bind(this)

    return {
      from(startValue: number) {
        return {
          to(endValue: number) {
            return {
              in(endTime: number) {
                onPlaySet(key).to(startValue)
                onPlaySet(key).to(endValue).endingAt(endTime)
              },
            }
          },
        }
      },
    }
  }
}

export default Connection
