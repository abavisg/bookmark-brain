#!/usr/bin/env node
// Chrome extensions reject files starting with "_". Rename them post-build.
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'dist')
if (!fs.existsSync(outDir)) process.exit(0)

const renamed = {}
for (const file of fs.readdirSync(outDir)) {
  if (file.startsWith('_') && file.endsWith('.js')) {
    const newName = file.replace(/^_+/, 'chunk-')
    fs.renameSync(path.join(outDir, file), path.join(outDir, newName))
    renamed[file] = newName
  }
}

if (Object.keys(renamed).length === 0) process.exit(0)

for (const jsFile of fs.readdirSync(outDir).filter((f) => f.endsWith('.js'))) {
  const filePath = path.join(outDir, jsFile)
  let content = fs.readFileSync(filePath, 'utf-8')
  let changed = false
  for (const [oldName, newName] of Object.entries(renamed)) {
    if (content.includes(oldName)) {
      content = content.replaceAll(oldName, newName)
      changed = true
    }
  }
  if (changed) fs.writeFileSync(filePath, content)
}
