import type { Ref } from 'vue'
import { ref } from 'vue'

export interface UseAudioContextReturn {
  ready: Ref<boolean>
  init: () => Promise<void>
}

export function useAudioContext(): UseAudioContextReturn {
  const ready = ref(false)

  async function init(): Promise<void> {
    const { initAudio } = await import('ez-web-audio')
    await initAudio()
    ready.value = true
  }

  return { ready, init }
}
