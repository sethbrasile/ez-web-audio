import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const evalRoot = resolve(scriptDir, '..')
const repoRoot = resolve(evalRoot, '../../..')
const reviewRoot = join(repoRoot, '.planning/reviews/product-api-fit')
const evidenceDir = join(reviewRoot, 'evidence')
const candidateDir = join(reviewRoot, 'documentation-candidates')
const runsDir = join(evalRoot, 'runs')

const evidenceSchema = JSON.parse(await readFile(join(reviewRoot, 'evidence.schema.json'), 'utf8'))
const runSchema = JSON.parse(await readFile(join(evalRoot, 'schemas/run-result.schema.json'), 'utf8'))
const failures = []

async function entries(path, directories = false) {
  try {
    const found = await readdir(path, { withFileTypes: true })
    return found
      .filter(entry => directories ? entry.isDirectory() : entry.isFile())
      .map(entry => entry.name)
      .sort()
  }
  catch (error) {
    if (error && error.code === 'ENOENT')
      return []
    throw error
  }
}

function validateRequired(record, schema, label) {
  for (const key of schema.required ?? []) {
    if (!(key in record))
      failures.push(`${label}: missing ${key}`)
  }
}

function validateEnum(value, allowed, label) {
  if (!allowed.includes(value))
    failures.push(`${label}: invalid value ${JSON.stringify(value)}`)
}

const evidenceIds = new Set()
const ecosystems = new Set()
const evidenceFiles = (await entries(evidenceDir)).filter(name => name.endsWith('.json'))
for (const name of evidenceFiles) {
  const label = `evidence/${name}`
  const record = JSON.parse(await readFile(join(evidenceDir, name), 'utf8'))
  validateRequired(record, evidenceSchema, label)
  if (evidenceIds.has(record.id))
    failures.push(`${label}: duplicate id ${record.id}`)
  evidenceIds.add(record.id)
  ecosystems.add(record.ecosystem)
  validateEnum(record.confidence, evidenceSchema.properties.confidence.enum, `${label}.confidence`)
  for (const layer of record.productLayers ?? [])
    validateEnum(layer, evidenceSchema.properties.productLayers.items.enum, `${label}.productLayers`)
  for (const tag of record.tags ?? [])
    validateEnum(tag, evidenceSchema.properties.tags.items.enum, `${label}.tags`)
}

let runCount = 0
for (const runId of await entries(runsDir, true)) {
  const resultPath = join(runsDir, runId, 'result.json')
  try {
    const result = JSON.parse(await readFile(resultPath, 'utf8'))
    validateRequired(result, runSchema, `runs/${runId}/result.json`)
    validateEnum(result.condition, runSchema.properties.condition.enum, `runs/${runId}.condition`)
    runCount += 1
  }
  catch (error) {
    const message = error && error.code === 'ENOENT' ? 'missing result.json' : error.message
    failures.push(`runs/${runId}/result.json: ${message}`)
  }
}

const candidateCount = (await entries(candidateDir)).filter(name => name.endsWith('.md')).length
if (failures.length > 0) {
  for (const failure of failures)
    console.error(failure)
  process.exitCode = 1
}
else {
  console.log(`evidence=${evidenceFiles.length} ecosystems=${ecosystems.size} runs=${runCount} documentationCandidates=${candidateCount}`)
}
