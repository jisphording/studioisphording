// Usage: node compare.mjs <a.png> <b.png> [diff.png]
// Prints mean per-channel values, mean abs diff and % of pixels whose max
// channel delta exceeds 8/255; optionally writes an amplified diff image.
import puppeteer from '/Users/jisphording/.npm/_npx/1ade4bf2e2bf80fd/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import fs from 'node:fs'

const [a, b, diffOut] = process.argv.slice(2)
const toUrl = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
const res = await page.evaluate(async (ua, ub) => {
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u })
  const [ia, ib] = await Promise.all([load(ua), load(ub)])
  const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height)
  const px = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data }
  const da = px(ia), db = px(ib)
  const out = new OffscreenCanvas(w, h), ox = out.getContext('2d'), od = ox.createImageData(w, h)
  let sa = [0, 0, 0], sb = [0, 0, 0], sd = 0, over = 0
  for (let i = 0; i < da.length; i += 4) {
    let m = 0
    for (let k = 0; k < 3; k++) {
      sa[k] += da[i + k]; sb[k] += db[i + k]
      const d = Math.abs(da[i + k] - db[i + k]); sd += d; if (d > m) m = d
    }
    if (m > 8) over++
    od.data[i] = od.data[i + 1] = od.data[i + 2] = 255 - Math.min(255, m * 4); od.data[i + 3] = 255
  }
  ox.putImageData(od, 0, 0)
  const blob = await out.convertToBlob({ type: 'image/png' })
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  const n = w * h
  return {
    size: `${w}x${h}`,
    meanA: sa.map((v) => +(v / n).toFixed(2)),
    meanB: sb.map((v) => +(v / n).toFixed(2)),
    meanAbsDiff: +(sd / (n * 3)).toFixed(3),
    pctPixelsOver8: +((over / n) * 100).toFixed(3),
    diff: btoa(bin),
  }
}, toUrl(a), toUrl(b))
await browser.close()
if (diffOut) fs.writeFileSync(diffOut, Buffer.from(res.diff, 'base64'))
delete res.diff
console.log(JSON.stringify(res))
