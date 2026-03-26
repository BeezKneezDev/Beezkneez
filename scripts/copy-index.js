import { copyFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'

// Public routes that need their own index.html for GitHub Pages
// (so they return 200 instead of 404)
const routes = [
  'lawn-mowing',
  'hedge-trimming',
  'garden-tidy-ups',
  'services',
  'flyer',
  'login',
]

const dist = 'dist'
const src = join(dist, 'index.html')

for (const route of routes) {
  const dest = join(dist, route, 'index.html')
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  console.log(`  copied → ${dest}`)
}

console.log(`\n✓ ${routes.length} routes pre-rendered for GitHub Pages`)
