// ============================================================
// Narration — agent-written text for each clip. LLM-optional.
// With no API key, deterministic fallbacks derive copy from the real
// transcript so a clip ALWAYS gets usable narration. AURA-wrapped.
// QUILL = copy (hook/caption/title/hashtags), TURTLE = virality score.
// ============================================================
import { aura } from './aura.ts'

export interface NarrationInput {
  startSec: number; endSec: number; durationSec: number; compositeScore: number
  primaryTopic: string; transcriptExcerpt: string
}
export interface Narration {
  hook: string; caption: string; title: string; hashtags: string[]
  viralityScore: number; agentCredits: { copy: string; score: string }
}
// Subset of the frontend's full BrandProfile actually used for narration —
// the rest (audience, voice characteristics, sample hooks) is available to
// wire into prompts later but not needed for the current fallback/LLM path.
export interface BrandVoice {
  toneVoice?: string
  brandHashtags?: string[]
  avoidTopics?: string[]
  styleNotes?: string
}

const STOP = new Set(['the','a','an','and','or','but','is','are','to','of','in','on','for','with','that','this','it','you','we','i'])

function firstStrongSentence(text: string): string {
  const parts = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  // prefer a question or one containing a punchy word
  const punchy = parts.find((p) => /\?|\b(never|always|secret|mistake|nobody|biggest|best|worst)\b/i.test(p))
  return (punchy || parts[0] || text).slice(0, 90)
}
function keywords(text: string, n: number): string[] {
  const freq = new Map<string, number>()
  for (const w of text.toLowerCase().match(/[a-z]{4,}/g) || []) {
    if (STOP.has(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w)
}
function titleCase(s: string): string { return s.replace(/\b\w/g, (c) => c.toUpperCase()) }

// ── deterministic fallbacks (no LLM) ──
function fbHook(c: NarrationInput): string { return firstStrongSentence(c.transcriptExcerpt) }
function fbCaption(c: NarrationInput): string { return c.transcriptExcerpt.slice(0, 140).trim() }
function fbTitle(c: NarrationInput): string {
  const kw = keywords(c.transcriptExcerpt, 3)
  return titleCase(kw.length ? kw.join(' ') : c.primaryTopic || 'Highlight')
}
function fbHashtags(c: NarrationInput, platforms: string[], brand?: BrandVoice): string[] {
  const base = ['#fyp', '#viral']
  const topic = (c.primaryTopic || 'clip').replace(/[^a-z0-9]/gi, '')
  const kw = keywords(c.transcriptExcerpt, 2).map((w) => '#' + w)
  const plat = platforms.includes('linkedin') ? ['#business'] : ['#shorts']
  const brandTags = (brand?.brandHashtags || []).map((h) => (h.startsWith('#') ? h : '#' + h))
  const all = [...brandTags, ...base, '#' + topic, ...kw, ...plat]
  return dedupeAvoiding(all, brand?.avoidTopics).slice(0, 6)
}

/**
 * Dedupe (case-insensitively, keeping first occurrence's original casing —
 * brand-authored tags like "#shaddaiAI" keep their intended casing) and drop
 * any tag mentioning an avoided topic.
 */
function dedupeAvoiding(tags: string[], avoidTopics?: string[]): string[] {
  const avoid = (avoidTopics || []).map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const seenKeys = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const normalized = '#' + raw.replace(/^#+/, '')
    const bareLower = normalized.slice(1).toLowerCase()
    if (!bareLower || seenKeys.has(bareLower)) continue
    if (avoid.some((a) => a && bareLower.includes(a))) continue
    seenKeys.add(bareLower)
    out.push(normalized)
  }
  return out
}

/** Parse a free-text LLM hashtag response ("#a, #b c") into clean, deduped, lowercase #tags. */
export function parseHashtagList(raw: string): string[] {
  const tags = (raw.match(/#?[a-zA-Z][a-zA-Z0-9_-]*/g) || [])
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((t) => t.toLowerCase())
  return dedupeAvoiding(tags)
}

// ── optional LLM (only if configured); AURA wraps the call ──
function llmEnabled(): boolean { return !!(process.env.OPENAI_API_KEY || process.env.LLM_URL) }
async function llmText(taskType: string, prompt: string, fallback: string): Promise<string> {
  if (!llmEnabled()) return fallback
  const out = await aura.text(taskType, prompt, async () => {
    // Minimal OpenAI-compatible call; any failure → '' (aura) → caller uses fallback.
    const url = (process.env.LLM_URL || 'https://api.openai.com/v1') + '/chat/completions'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` },
      body: JSON.stringify({ model: process.env.LLM_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 60 }),
    })
    if (!res.ok) throw new Error('llm ' + res.status)
    const j: any = await res.json()
    return String(j?.choices?.[0]?.message?.content || '').trim()
  })
  return out || fallback
}

export async function narrate(c: NarrationInput, platforms: string[], brand?: BrandVoice): Promise<Narration> {
  const ex = c.transcriptExcerpt || ''
  const toneNote = brand?.toneVoice ? ` Tone: ${brand.toneVoice}.` : ''
  const styleNote = brand?.styleNotes ? ` Style: ${brand.styleNotes}.` : ''
  const avoidNote = brand?.avoidTopics?.length ? ` Avoid mentioning: ${brand.avoidTopics.join(', ')}.` : ''
  const brandContext = toneNote + styleNote + avoidNote

  const fallbackHashtags = fbHashtags(c, platforms, brand)
  const [hook, caption, title, hashtagsRaw] = await Promise.all([
    llmText('hook', `Write a punchy 1-line hook for a short video clip about: "${ex}".${brandContext} Max 90 chars, no hashtags.`, fbHook(c)),
    llmText('caption', `Write a 1-2 sentence on-screen caption for: "${ex}".${brandContext} Max 140 chars.`, fbCaption(c)),
    llmText('title', `Write a 3-6 word punchy title for a clip about: "${ex}".${brandContext}`, fbTitle(c)),
    llmText('hashtags', `List 5-6 relevant hashtags (space-separated, with #) for a short video clip about: "${ex}".${brandContext}`, ''),
  ])

  const llmHashtags = parseHashtagList(hashtagsRaw)
  const brandTags = (brand?.brandHashtags || []).map((h) => (h.startsWith('#') ? h : '#' + h))
  const hashtags = llmHashtags.length
    ? dedupeAvoiding([...brandTags, ...llmHashtags], brand?.avoidTopics).slice(0, 6)
    : fallbackHashtags

  return {
    hook, caption, title, hashtags,
    viralityScore: c.compositeScore,
    agentCredits: { copy: 'QUILL', score: 'TURTLE' },
  }
}
