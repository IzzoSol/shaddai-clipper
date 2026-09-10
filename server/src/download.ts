// ============================================================
// Paste-a-URL ingestion — download a source video from a public URL
// (YouTube, TikTok, X, ~1800 sites yt-dlp supports) so it can be fed
// into the exact same pipeline a file upload uses.
//
// Uses yt-dlp-exec (MIT), which downloads a static yt-dlp binary at
// npm-install time — same pattern as ffmpeg-static, no Python needed.
// ============================================================

import ytDlpExec from 'yt-dlp-exec'
import ffmpegPath from 'ffmpeg-static'
import { mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { assertSafePublicUrl } from './url-validate.ts'

/** Best-effort title lookup (metadata-only, no download) — falls back to the URL's host on failure. */
export async function probeUrlTitle(sourceUrl: string): Promise<string | null> {
  try {
    const info: any = await ytDlpExec(sourceUrl, { dumpSingleJson: true, noPlaylist: true, skipDownload: true })
    const title = typeof info?.title === 'string' ? info.title.trim() : ''
    return title || null
  } catch {
    return null // metadata lookup failing shouldn't block the actual download
  }
}

/**
 * Download the given URL into `destDir` as `original.<ext>` and return the
 * full path. Caller is responsible for the SSRF-safe destDir (per-source
 * folder under DATA_DIR, same as uploads).
 */
export async function downloadFromUrl(sourceUrl: string, destDir: string): Promise<string> {
  assertSafePublicUrl(sourceUrl) // throws on non-https / private hosts

  await mkdir(destDir, { recursive: true })
  const outputTemplate = join(destDir, 'original.%(ext)s')

  await ytDlpExec(sourceUrl, {
    output: outputTemplate,
    // Sites like YouTube serve audio/video as separate DASH streams — request
    // both and let yt-dlp mux them (needs ffmpeg, pointed at our bundled static
    // binary below). Falls back to a single combined stream where that's all
    // that's offered (e.g. some generic direct-file hosts).
    format: 'bestvideo*+bestaudio/best',
    mergeOutputFormat: 'mp4',
    ffmpegLocation: (ffmpegPath as unknown as string) || undefined,
    noPlaylist: true,
    maxFilesize: '2G',
  })

  const files = (await readdir(destDir)).filter((f) => f.startsWith('original.'))
  if (!files.length) throw new Error('Download completed but no output file was found')
  return join(destDir, files[0]!)
}
