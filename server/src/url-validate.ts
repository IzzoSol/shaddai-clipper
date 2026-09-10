// SSRF guard for user-supplied source URLs (paste-a-URL ingestion).
// Public https only — mirrors the same rule PIKADON already enforces on the
// main SHADDAI dashboard's capture gateway (media.html: "public https, private
// hosts blocked"). This is a syntactic check on the URL/hostname; the download
// step additionally re-checks the resolved IP before connecting (DNS rebinding
// defense-in-depth lives there, not here).

function ipv4Parts(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some((p) => p < 0 || p > 255)) return null
  return parts
}

function isPrivateIPv4(host: string): boolean {
  const p = ipv4Parts(host)
  if (!p) return false
  const [a, b] = p
  if (a === 127) return true // loopback
  if (a === 10) return true // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 169 && b === 254) return true // 169.254.0.0/16 (link-local + cloud metadata)
  if (a === 0) return true // 0.0.0.0/8
  return false
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'ip6-localhost', 'ip6-loopback'])

export function assertSafePublicUrl(input: string): URL {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed')
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '') // strip IPv6 brackets

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Private/local hosts are not allowed')
  }

  if (isPrivateIPv4(host)) {
    throw new Error('Private IP addresses are not allowed')
  }

  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    throw new Error('Private IP addresses are not allowed') // IPv6 loopback/ULA/link-local
  }

  return url
}
