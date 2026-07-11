import { useCallback, useRef, useState } from 'react'

export interface UseAudioContextReturn {
  ready: boolean
  init: () => Promise<void>
  getContext: () => Promise<AudioContext>
}

export function useAudioContext(): UseAudioContextReturn {
  const [ready, setReady] = useState(false)
  const initialized = useRef(false)
  const pending = useRef<Promise<void> | null>(null)

  const init = useCallback((): Promise<void> => {
    if (initialized.current)
      return Promise.resolve()
    if (pending.current)
      return pending.current

    pending.current = (async () => {
      const { initAudio } = await import('ez-web-audio')
      await initAudio()
      initialized.current = true
      setReady(true)
    })().finally(() => {
      pending.current = null
    })
    return pending.current
  }, [])

  const getContext = useCallback(async (): Promise<AudioContext> => {
    const { getAudioContext } = await import('ez-web-audio')
    return getAudioContext()
  }, [])

  return { ready, init, getContext }
}
