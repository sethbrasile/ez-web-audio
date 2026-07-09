import { createApp, defineComponent, h } from 'vue'

export function mount<T>(setup: () => T): { result: T, unmount: () => void } {
  let result!: T
  const app = createApp(defineComponent({
    setup() {
      result = setup()
      return () => h('div')
    },
  }))
  const el = document.createElement('div')
  app.mount(el)
  return { result, unmount: () => app.unmount() }
}
