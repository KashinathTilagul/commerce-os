#!/usr/bin/env node
/**
 * Ponytail Codebase Auditor — Scans repository for bloat, large files,
 * ponytail ceiling tags, and code quality metrics.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIRS = [
  path.join(ROOT, 'apps', 'frontend', 'src'),
  path.join(ROOT, 'mini-services'),
  path.join(ROOT, 'scripts'),
]

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList
  const files = fs.readdirSync(dir)

  for (const file of files) {
    if (file.startsWith('.') || file === 'node_modules' || file === 'dist' || file === '.next') continue
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList)
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(filePath)
    }
  }
  return fileList
}

function runAudit() {
  console.log('\n==================================================')
  console.log('         PONYTAIL CODEBASE AUDIT RUNNER           ')
  console.log('==================================================\n')

  let totalFiles = 0
  let totalLines = 0
  let ponytailTags = []
  let largeFiles = []

  for (const sourceDir of SOURCE_DIRS) {
    const files = scanDirectory(sourceDir)
    totalFiles += files.length

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      totalLines += lines.length

      const relativePath = path.relative(ROOT, filePath)

      if (lines.length > 350) {
        largeFiles.push({ path: relativePath, lines: lines.length })
      }

      lines.forEach((line, index) => {
        if (line.includes('ponytail:')) {
          ponytailTags.push({ path: relativePath, line: index + 1, text: line.trim() })
        }
      })
    }
  }

  console.log(`📊 Scanned Files : ${totalFiles}`)
  console.log(`📝 Total Lines   : ${totalLines}`)
  console.log(`🏷️  Ponytail Tags : ${ponytailTags.length}`)
  console.log(`📦 Large Files (>350 LOC): ${largeFiles.length}\n`)

  if (ponytailTags.length > 0) {
    console.log('--------------------------------------------------')
    console.log('🏷️  PONYTAIL KNOWN CEILINGS & TAGS:')
    console.log('--------------------------------------------------')
    ponytailTags.forEach(tag => {
      console.log(`  - [${tag.path}:${tag.line}] ${tag.text}`)
    })
    console.log('')
  }

  if (largeFiles.length > 0) {
    console.log('--------------------------------------------------')
    console.log('⚠️  LARGE FILES (Consider Ponytail Deletion/Split):')
    console.log('--------------------------------------------------')
    largeFiles.sort((a, b) => b.lines - a.lines).slice(0, 10).forEach(f => {
      console.log(`  - ${f.path} (${f.lines} lines)`)
    })
    console.log('')
  }

  console.log('==================================================')
  console.log('✅ Ponytail Code Audit Complete!')
  console.log('==================================================\n')
}

runAudit()
