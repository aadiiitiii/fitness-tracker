/**
 * Vercel serverless function — proxies USDA FoodData Central searches.
 * Keeps the API key server-side and adds response caching.
 *
 * GET /api/usda-search?query=chicken
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query } = req.query

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter' })
  }

  const trimmed = query.trim()
  if (trimmed.length < 1 || trimmed.length > 200) {
    return res.status(400).json({ error: 'Query must be 1–200 characters' })
  }

  const key = process.env.USDA_API_KEY || 'DEMO_KEY'
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(trimmed)}&pageSize=15&dataType=Survey%20(FNDDS),SR%20Legacy,Foundation&api_key=${key}`

  try {
    const upstream = await fetch(url)
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'USDA API error' })
    }
    const data = await upstream.json()

    // Cache at the CDN edge for 24h; stale responses served while revalidating
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600')
    return res.status(200).json(data)
  } catch {
    return res.status(500).json({ error: 'Failed to reach USDA API' })
  }
}
