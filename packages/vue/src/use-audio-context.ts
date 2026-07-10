import type { Ref } from 'vue'
import { ref } from 'vue'

export interface UseAudioContextReturn {
  ready: Ref<boolean>
  init: () => Promise<void>
  getContext: () => Promise<AudioContext>
}

export function useAudioContext(): UseAudioContextReturn {
  const ready = ref(false)

  async function init(): Promise<void> {
    const { initAudio } = await import('ez-web-audio')
    await initAudio()
    ready.value = true
  }

  async function getContext(): Promise<AudioContext> {
    const { getAudioContext } = await import('ez-web-audio')
    return getAudioContext()
  }

  return { ready, init, getContext }
}
