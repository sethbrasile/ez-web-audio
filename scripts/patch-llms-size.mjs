import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const distDir = 'docs/.vitepress/dist'
const llmsFullPath = join(distDir, 'llms-full.txt')

let sizeKB

try {
  const stats = statSync(llmsFullPath)
  sizeKB = Math.round(stats.size / 1024)
}
catch {
  console.warn('Warning: llms-full.txt not found in dist. Skipping size patching.')
  process.exit(0)
}

const placeholder = '__LLMS_FULL_SIZE__'
const replacement = `${sizeKB} KB`
let patchedCount = 0

function walkDir(dir, callback) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(fullPath, callback)
    }
    else {
      callback(fullPath)
    }
  }
}

walkDir(distDir, (filePath) => {
  if (!filePath.endsWith('.html') && !filePath.endsWith('.txt')) {
    return
  }

  const content = readFileSync(filePath, 'utf-8')
  if (content.includes(placeholder)) {
    writeFileSync(filePath, content.replaceAll(placeholder, replacement), 'utf-8')
    patchedCount++
  }
})

console.log(`Patched llms-full.txt size: ${sizeKB} KB (${patchedCount} files updated)`)
