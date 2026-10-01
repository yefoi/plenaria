import type { MetadataRoute } from 'next';
import { MUNICIPIOS } from '@/lib/config';

export const dynamic = 'force-dynamic';

const BASE = 'https://plenaria-civica.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();
  return [
    { url: BASE, lastModified: ahora, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/metodologia`, lastModified: ahora, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/fuentes`, lastModified: ahora, changeFrequency: 'daily', priority: 0.5 },
    ...MUNICIPIOS.map((m) => ({
      url: `${BASE}/m/${m.id}`,
      lastModified: ahora,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
