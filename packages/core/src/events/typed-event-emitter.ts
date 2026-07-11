/**
 * Typed event emitter base class for audio lifecycle events.
 *
 * Extends the native `EventTarget` API with:
 * - Type-safe `addEventListener` / `removeEventListener` overloads
 * - A protected `emit()` helper that creates and dispatches typed `CustomEvent` instances
 * - Chainable `on()` / `once()` / `off()` convenience methods
 *
 * Usage — extend this class with a concrete event map:
 *
 * ```typescript
 * interface MyEventMap {
 *   play: CustomEvent<{ time: number }>
 *   stop: CustomEvent<{ time: number }>
 * }
 *
 * class MyEmitter extends TypedEventEmitter<MyEventMap> {
 *   trigger() {
 *     this.emit('play', { time: Date.now() })
 *   }
 * }
 * ```
 *
 * @typeParam TMap - Record mapping event name strings to `CustomEvent` types.
 */
export class TypedEventEmitter<TMap extends { [K in keyof TMap]: CustomEvent<unknown> }> extends EventTarget {
  /**
   * Backs {@link _clearListeners}. Every listener registered through this
   * class's `addEventListener()` (directly, or via `on()`/`once()`) is
   * silently tied to this controller's signal, so aborting it removes every
   * listener at once without needing a native `removeAllListeners()`.
   */
  private _listenerAbortController = new AbortController()

  /**
   * Add a typed event listener for known event types.
   * Overloaded to provide type safety for known event types while remaining
   * compatible with the native `EventTarget` API.
   *
   * @param type - The event type (key of TMap)
   * @param listener - Typed event handler
   * @param options - Standard addEventListener options
   */
  addEventListener<K extends keyof TMap & string>(
    type: K,
    listener: (event: TMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void
  // Implementation signature uses `any` to accept all typed overload listener variants
  addEventListener(type: string, listener: any, options?: boolean | AddEventListenerOptions): void {
    const normalized: AddEventListenerOptions = typeof options === 'boolean' ? { capture: options } : { ...options }
    normalized.signal = this._listenerAbortController.signal
    super.addEventListener(type, listener as EventListener, normalized)
  }

  /**
   * Remove a typed event listener for known event types.
   * Overloaded to provide type safety for known event types while remaining
   * compatible with the native `EventTarget` API.
   *
   * @param type - The event type (key of TMap)
   * @param listener - Typed event handler to remove
   * @param options - Standard removeEventListener options
   */
  removeEventListener<K extends keyof TMap & string>(
    type: K,
    listener: (event: TMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ): void
  // Implementation signature uses `any` to accept all typed overload listener variants
  removeEventListener(type: string, listener: any, options?: boolean | EventListenerOptions): void {
    super.removeEventListener(type, listener as EventListener, options)
  }

  /**
   * Emit a typed event with the given detail.
   *
   * Creates a `CustomEvent` with the provided detail and dispatches it on this
   * target. Subclasses call this internally to fire lifecycle events.
   *
   * @param type - The event type to emit (key of TMap)
   * @param detail - The event detail object (typed by TMap)
   * @protected
   */
  protected emit<K extends keyof TMap & string>(
    type: K,
    detail: TMap[K]['detail'],
  ): void {
    const event = new CustomEvent(type, { detail })
    this.dispatchEvent(event)
  }

  /**
   * Subscribe to one or more events. Supports chaining.
   *
   * @param type - The event type(s) to subscribe to (key or array of keys of TMap)
   * @param listener - The event handler function
   * @returns `this` for chaining
   *
   * @example
   * ```typescript
   * emitter.on('play', handlePlay).on('stop', handleStop)
   * emitter.on(['play', 'stop'], handleBoth)
   * ```
   */
  on<K extends keyof TMap & string>(
    type: K | K[],
    listener: (event: TMap[K]) => void,
  ): this {
    if (Array.isArray(type)) {
      type.forEach(t => this.addEventListener(t, listener as (event: TMap[typeof t]) => void))
    }
    else {
      this.addEventListener(type, listener)
    }
    return this
  }

  /**
   * Subscribe to an event once. Handler is removed after first invocation.
   *
   * @param type - The event type to subscribe to
   * @param listener - The event handler function
   * @returns `this` for chaining
   *
   * @example
   * ```typescript
   * emitter.once('end', () => console.log('Finished'))
   * ```
   */
  once<K extends keyof TMap & string>(
    type: K,
    listener: (event: TMap[K]) => void,
  ): this {
    this.addEventListener(type, listener, { once: true })
    return this
  }

  /**
   * Unsubscribe from an event.
   *
   * Note: Due to native `EventTarget` limitations, you must provide the same
   * listener function reference that was used when subscribing.
   *
   * @param type - The event type to unsubscribe from
   * @param listener - The event handler function to remove
   * @returns `this` for chaining
   *
   * @example
   * ```typescript
   * const handler = (e) => console.log(e.detail)
   * emitter.on('play', handler)
   * // later...
   * emitter.off('play', handler)
   * ```
   */
  off<K extends keyof TMap & string>(
    type: K,
    listener: (event: TMap[K]) => void,
  ): this {
    this.removeEventListener(type, listener)
    return this
  }

  /**
   * Remove every listener registered through this emitter (via
   * `addEventListener()`, `on()`, or `once()`), regardless of how many or
   * what event type they're bound to.
   *
   * Native `EventTarget` has no `removeAllListeners()`. This works around
   * that by aborting a shared `AbortSignal` threaded through every
   * `addEventListener()` call this class makes, then swapping in a fresh
   * `AbortController` so the instance can keep accepting new listeners
   * afterward (e.g. if it's reused before being garbage collected).
   *
   * Subclasses call this from their `dispose()` alongside neutering
   * `dispatchEvent` — the neuter stops future emits, this stops stale
   * listener closures from being retained/invoked at all.
   *
   * @protected
   */
  protected _clearListeners(): void {
    this._listenerAbortController.abort()
    this._listenerAbortController = new AbortController()
  }
}
