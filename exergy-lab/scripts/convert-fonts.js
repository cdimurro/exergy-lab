#!/usr/bin/env node
/**
 * Font Conversion Script for jsPDF
 *
 * Downloads Inter font and converts to base64 for embedding.
 * Run with: node scripts/convert-fonts.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'lib', 'fonts')

/**
 * Fetch Google Fonts CSS to extract TTF URLs
 */
function fetchFontCSS(family, weight) {
  return new Promise((resolve, reject) => {
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`
    const options = {
      headers: {
        // Request TTF format by pretending to be an older browser
        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)'
      }
    }

    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch CSS: ${response.statusCode}`))
        return
      }

      let data = ''
      response.on('data', (chunk) => { data += chunk })
      response.on('end', () => {
        // Extract URL from CSS
        const match = data.match(/src:\s*url\(([^)]+)\)/)
        if (match) {
          resolve(match[1])
        } else {
          reject(new Error('Could not find font URL in CSS'))
        }
      })
      response.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Download a file from URL
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http')

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location).then(resolve).catch(reject)
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }

      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * Generate TypeScript file with base64 font data
 */
function generateFontFile(name, buffer) {
  const base64 = buffer.toString('base64')
  const exportName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Base64'

  return `/**
 * ${name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Font
 *
 * Auto-generated from Google Fonts Inter family.
 * Do not edit manually - run scripts/convert-fonts.js to regenerate.
 *
 * Font size: ${(buffer.length / 1024).toFixed(1)} KB
 */

export const ${exportName} = '${base64}'
`
}

/**
 * Font configurations
 */
const FONTS = [
  { name: 'inter-regular', family: 'Inter', weight: 400 },
  { name: 'inter-semibold', family: 'Inter', weight: 600 },
  { name: 'inter-bold', family: 'Inter', weight: 700 },
]

/**
 * Main execution
 */
async function main() {
  console.log('Converting fonts for jsPDF...\n')

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  for (const font of FONTS) {
    console.log(`Processing ${font.name}...`)
    try {
      // Get font URL from Google Fonts CSS
      console.log(`  Fetching font URL...`)
      const fontUrl = await fetchFontCSS(font.family, font.weight)
      console.log(`  URL: ${fontUrl.substring(0, 50)}...`)

      // Download font file
      console.log(`  Downloading font...`)
      const buffer = await downloadFile(fontUrl)
      console.log(`  Downloaded ${(buffer.length / 1024).toFixed(1)} KB`)

      // Generate TypeScript file
      const content = generateFontFile(font.name, buffer)
      const outputPath = path.join(OUTPUT_DIR, `${font.name}.ts`)
      fs.writeFileSync(outputPath, content)
      console.log(`  Written to ${font.name}.ts\n`)
    } catch (error) {
      console.error(`  Error: ${error.message}\n`)

      // Create placeholder file
      const placeholderPath = path.join(OUTPUT_DIR, `${font.name}.ts`)
      const exportName = font.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Base64'
      fs.writeFileSync(placeholderPath, `// Placeholder - font download failed\nexport const ${exportName} = ''\n`)
    }
  }

  console.log('Font conversion complete!')
}

main().catch(console.error)
