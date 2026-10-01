import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/m/*/rss.xml' },
    sitemap: 'https://plenaria-civica.vercel.app/sitemap.xml',
  };
}
