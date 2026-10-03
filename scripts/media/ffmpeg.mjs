// A thin, mockable wrapper around ffmpeg/ffprobe — the only module in the
// pipeline that spawns a process for video work.
//
// encode-video.mjs is written against the object this returns:
//
//   {
//     async probe(file) -> { width, height, duration, hasAudio }
//     async encode({ input, output, args }) -> { bytes }
//     async extractFrame({ input, output, at }) -> { bytes }
//   }
//
// Tests hand encode-video.mjs a fake with that shape, so no suite ever runs a
// real encode. `run` is injectable for the wrapper's own tests.

import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// ffmpeg writes progress to stderr; `-loglevel error` keeps only failures.
const QUIET = ['-hide_banner', '-loglevel', 'error', '-nostdin']

export const createFfmpeg = ({
  ffmpegBin = 'ffmpeg',
  ffprobeBin = 'ffprobe',
  run = (bin, args) => execFileAsync(bin, args, { maxBuffer: 64 * 1024 * 1024 }),
  size = (file) => statSync(file).size
} = {}) => ({
  async probe(file) {
    const { stdout } = await run(ffprobeBin, [
      '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height',
      '-of', 'json', file
    ])
    const { format = {}, streams = [] } = JSON.parse(stdout)
    const video = streams.find((stream) => stream.codec_type === 'video')
    if (!video) throw new Error(`ffmpeg: no video stream in ${file}`)
    return {
      width: video.width,
      height: video.height,
      duration: Number(format.duration),
      hasAudio: streams.some((stream) => stream.codec_type === 'audio')
    }
  },

  async encode({ input, output, args }) {
    await run(ffmpegBin, [...QUIET, '-y', '-i', input, ...args, output])
    return { bytes: size(output) }
  },

  async extractFrame({ input, output, at }) {
    await run(ffmpegBin, [...QUIET, '-y', '-ss', String(at), '-i', input, '-frames:v', '1', '-q:v', '2', output])
    return { bytes: size(output) }
  }
})
