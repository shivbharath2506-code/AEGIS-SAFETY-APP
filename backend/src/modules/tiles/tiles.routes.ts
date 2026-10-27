import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../../utils/logger';

const router = Router();

// In-memory tile cache with 24-hour TTL and max 1000 items
const tileCache = new Map<string, { data: Buffer; contentType: string; expires: number }>();
const MAX_CACHE_ENTRIES = 1000;
const TILE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

router.get('/osm/:z/:x/:y', async (req: Request, res: Response) => {
  const z = String(req.params.z);
  const x = String(req.params.x);
  const rawY = String(req.params.y);
  const cleanY = rawY.replace(/\.png$/, '');
  const cacheKey = `${z}/${x}/${cleanY}`;
  const now = Date.now();

  const cached = tileCache.get(cacheKey);
  if (cached && cached.expires > now) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-AEGIS-Tile-Cache', 'HIT');
    return res.send(cached.data);
  }

  try {
    const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${cleanY}.png`;
    const response = await axios.get(osmUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'AEGIS-Emergency-Safety-Portal/1.0 (Academic College Project; contact: aegis-admin@localhost)',
        'Referer': 'http://localhost:5000/'
      },
      timeout: 6000
    });

    const contentType = String(response.headers['content-type'] || 'image/png');
    const buffer = Buffer.from(response.data);

    if (tileCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = tileCache.keys().next().value;
      if (firstKey) tileCache.delete(firstKey);
    }
    tileCache.set(cacheKey, { data: buffer, contentType, expires: now + TILE_TTL_MS });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-AEGIS-Tile-Cache', 'MISS');
    res.send(buffer);
  } catch (err: any) {
    logger.warn(`OSM tile fetch failed for ${cacheKey}, falling back to Esri:`, { error: err.message });
    // Failover seamlessly to Esri World Street Map
    return res.redirect(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${cleanY}/${x}`);
  }
});

export default router;
