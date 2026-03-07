/**
 * Vitest setup file: Polyfills BaseAudioContext for the test environment.
 *
 * In browsers, BaseAudioContext is the parent class of AudioContext and
 * OfflineAudioContext. The standardized-audio-context-mock library doesn't
 * provide it, so we create a minimal polyfill that allows `instanceof
 * BaseAudioContext` checks to work with mock AudioContext instances.
 */
import { AudioContext as MockAudioContext } from 'standardized-audio-context-mock'

if (typeof globalThis.BaseAudioContext === 'undefined') {
  // Create a BaseAudioContext class that the mock AudioContext is an instance of.
  // We use Symbol.hasInstance so that `instanceof BaseAudioContext` checks the
  // prototype chain for the mock's methods (createGain, createDelay, etc.).
  class BaseAudioContext {
    static [Symbol.hasInstance](instance: unknown): boolean {
      return (
        typeof instance === 'object'
        && instance !== null
        && typeof (instance as any).createGain === 'function'
        && typeof (instance as any).createDelay === 'function'
      )
    }
  }

  ;(globalThis as any).BaseAudioContext = BaseAudioContext
}
