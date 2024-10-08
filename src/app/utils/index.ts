export interface Component {
  setup: () => void
  html: string
  toString: () => string
}

export function escapeHTML(html: string): string {
  return new Option(html).innerHTML
}

export function codeBlock(code: string): string {
  return `<div class="card"><pre><code class="language-typescript">${escapeHTML(code.trim())}</code></pre></div>`
}

export function inlineCode(input: string): string {
  return `<code class="notranslate inline-code">${escapeHTML(input.trim())}</code>`
}

export function htmlBlock(code: string): string {
  return `<div class="card"><pre><code class="language-html">${escapeHTML(code.trim())}</code></pre></div>`
}

export function getSamplesPaths(instrument: string): string[] {
  return [1, 2, 3].map(num => `/ez-web-audio/drum-samples/${instrument}${num}.wav`)
}

export function debounce(fn: () => any, ms = 300) {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: any, ...args: []) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}
