const PREVIEW_TIMEOUT_MS = 8000
const MAX_HTML_SIZE = 350000
const SCREENSHOT_TIMEOUT_MS = 6500

const META_IMAGE_PRIORITY = [
  'og:image:secure_url',
  'og:image:url',
  'og:image',
  'twitter:image',
  'twitter:image:src'
]

const ICON_REL_PRIORITY = [
  'apple-touch-icon',
  'apple-touch-icon-precomposed',
  'icon',
  'shortcut icon'
]

function isPrivateIpv4(hostname) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false
  const [a, b] = hostname.split('.').map(Number)
  if (a === 10) return true
  if (a === 127) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 169 && b === 254) return true
  if (a === 0) return true
  return false
}

function isBlockedHostname(hostname) {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower === '0.0.0.0' || lower === '::1') return true
  if (lower.endsWith('.local')) return true
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true
  return isPrivateIpv4(lower)
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/gi, '/')
}

function extractAttribute(tag, attrName) {
  const regex = new RegExp(`${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const match = tag.match(regex)
  return (match?.[1] || match?.[2] || match?.[3] || '').trim()
}

function normalizeCandidateUrl(value, baseUrl) {
  if (!value) return null
  const cleanedValue = decodeHtmlEntities(value.trim().replace(/^['"]|['"]$/g, ''))
  if (!cleanedValue || cleanedValue.startsWith('data:')) return null

  try {
    const resolved = new URL(cleanedValue, baseUrl)
    if (!['http:', 'https:'].includes(resolved.protocol)) return null
    return resolved.toString()
  } catch {
    return null
  }
}

function extractPreviewFromHtml(html, pageUrl) {
  const metaByKey = new Map()
  const iconByRel = new Map()

  const metaTags = html.match(/<meta\b[^>]*>/gi) || []
  for (const tag of metaTags) {
    const rawKey = (extractAttribute(tag, 'property') || extractAttribute(tag, 'name') || '').toLowerCase()
    const content = extractAttribute(tag, 'content')
    if (!rawKey || !content) continue

    const normalizedUrl = normalizeCandidateUrl(content, pageUrl)
    if (!normalizedUrl) continue
    if (!metaByKey.has(rawKey)) {
      metaByKey.set(rawKey, normalizedUrl)
    }
  }

  const linkTags = html.match(/<link\b[^>]*>/gi) || []
  for (const tag of linkTags) {
    const rel = extractAttribute(tag, 'rel').toLowerCase()
    const href = extractAttribute(tag, 'href')
    if (!rel || !href || !rel.includes('icon')) continue

    const normalizedUrl = normalizeCandidateUrl(href, pageUrl)
    if (!normalizedUrl) continue
    if (!iconByRel.has(rel)) {
      iconByRel.set(rel, normalizedUrl)
    }
  }

  for (const key of META_IMAGE_PRIORITY) {
    if (metaByKey.has(key)) {
      return { previewUrl: metaByKey.get(key), source: key, faviconUrl: null }
    }
  }

  for (const rel of ICON_REL_PRIORITY) {
    if (iconByRel.has(rel)) {
      return { previewUrl: null, source: rel, faviconUrl: iconByRel.get(rel) }
    }
  }

  const fallbackFavicon = normalizeCandidateUrl('/favicon.ico', pageUrl)
  return { previewUrl: null, source: fallbackFavicon ? 'favicon.ico' : null, faviconUrl: fallbackFavicon }
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!titleMatch?.[1]) return null
  return decodeHtmlEntities(titleMatch[1].trim().replace(/\s+/g, ' '))
}

async function fetchPageHtml(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'accept': 'text/html,application/xhtml+xml',
        'user-agent': 'MVPMarketplacePreviewBot/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`No se pudo acceder al enlace (status ${response.status})`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('text/html')) {
      throw new Error('La URL no apunta a una pagina HTML')
    }

    const html = await response.text()
    return {
      html: html.slice(0, MAX_HTML_SIZE),
      finalUrl: response.url || url
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchScreenshotFallback(url) {
  const endpoint = new URL('https://api.microlink.io/')
  endpoint.searchParams.set('url', url)
  endpoint.searchParams.set('screenshot', 'true')
  endpoint.searchParams.set('meta', 'false')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SCREENSHOT_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint.toString(), {
      signal: controller.signal,
      headers: {
        'accept': 'application/json',
        'user-agent': 'MVPMarketplacePreviewBot/1.0'
      }
    })

    if (!response.ok) return null
    const data = await response.json()
    const screenshotUrl = data?.data?.screenshot?.url
    return normalizeCandidateUrl(screenshotUrl, url)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * POST /api/mvps/preview-from-url
 * Extrae una imagen de preview desde metadatos de una URL pública.
 */
export async function getUrlPreview(req, res) {
  try {
    const { url } = req.body || {}

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Debes enviar un campo url válido'
      })
    }

    let parsedUrl
    try {
      parsedUrl = new URL(url.trim())
    } catch {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URL inválida'
      })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'La URL debe usar http:// o https://'
      })
    }

    if (isBlockedHostname(parsedUrl.hostname)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'La URL apunta a un host no permitido'
      })
    }

    const { html, finalUrl } = await fetchPageHtml(parsedUrl.toString())
    const title = extractTitle(html)
    const previewData = extractPreviewFromHtml(html, finalUrl)
    const screenshotFallback = previewData.previewUrl
      ? null
      : await fetchScreenshotFallback(finalUrl)

    res.status(200).json({
      success: true,
      data: {
        title,
        preview_url: previewData.previewUrl || screenshotFallback,
        favicon_url: previewData.faviconUrl,
        source: previewData.previewUrl
          ? previewData.source
          : (screenshotFallback ? 'microlink:screenshot' : previewData.source)
      }
    })
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Timeout al intentar obtener preview del enlace'
      : (error?.message || 'No se pudo generar el preview del enlace')

    res.status(422).json({
      error: 'Preview Error',
      message
    })
  }
}
