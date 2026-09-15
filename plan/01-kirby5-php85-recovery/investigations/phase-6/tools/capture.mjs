// Usage: node capture.mjs <label> <outDir>
// Captures deterministic WebGL frames of World_01 (project.three) and
// World_02 (moodboard harness) plus page screenshots and console logs.
import puppeteer from '/Users/jisphording/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import fs from 'node:fs'
import path from 'node:path'

const [label, outDir] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const BASE = 'http://localhost:8011'

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  userDataDir: path.join(outDir, '..', 'chrome-profile'),
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,800'],
})

async function run(name, url, { inject = null, ready, freeze }) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
  const logs = []
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  if (inject) await page.evaluateOnNewDocument(inject)
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction(ready, { timeout: 60000, polling: 250 })
  await page.evaluate(freeze)
  await new Promise((r) => setTimeout(r, 1500))
  const frame = await page.evaluate(() => {
    const e = window.experience
    e.renderer.update()
    return e.renderer.instance.domElement.toDataURL('image/png')
  })
  fs.writeFileSync(path.join(outDir, `${name}-${label}-canvas.png`), Buffer.from(frame.split(',')[1], 'base64'))
  await page.screenshot({ path: path.join(outDir, `${name}-${label}-page.png`) })
  const meta = await page.evaluate(() => ({ revision: window.__THREE__ || null }))
  fs.writeFileSync(path.join(outDir, `${name}-${label}-console.txt`), [`three revision: ${meta.revision}`, ...logs].join('\n'))
  await page.close()
  return logs
}

const w1 = await run('world01', `${BASE}/de/projects/isphording-inneneinrichtung`, {
  ready: () => window.experience && window.experience.world && window.experience.world.display && window.experience.world.environment,
  freeze: () => {
    const e = window.experience
    e.world.update = () => {}
    e.world.display.model.rotation.y = Math.PI - 0.6
    e.camera.instance.position.set(0, 0, 10)
    e.camera.controls.target.set(0, 0, 0)
    e.camera.controls.update()
  },
})

const w2 = await run('moodboard', `${BASE}/de/about`, {
  // Moodboard template has no content page; inject its canvas-minimal markup
  // so index.js boots World_02 exactly like app/site/templates/moodboard.php.
  inject: () => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('section')
      s.className = 'canvas-minimal'
      s.style.cssText = 'position:fixed;inset:0;z-index:9'
      s.innerHTML = '<canvas id="webgl" class="canvas-minimal" data-world="World_02" style="z-index:9;width:100%;height:100%;display:block"></canvas>'
      document.body.prepend(s)
    })
  },
  ready: () => window.experience && window.experience.world && window.experience.world.moodboard && window.experience.world.moodboard.moodboardImages.length > 0,
  freeze: () => {
    const e = window.experience
    e.world.update = () => {}
    e.world.moodboard.moodboardImages.forEach((m) => m.scale.set(1, 1, 1))
    e.camera.controls && e.camera.controls.update()
  },
})

await browser.close()
const warn = [...w1, ...w2].filter((l) => /THREE\.|deprecat/i.test(l))
console.log(`${label}: done. three-related warnings:\n${warn.join('\n') || '(none)'}`)
