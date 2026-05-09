import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaxBee - Expert ITR Filing & Tax Planning',
    short_name: 'TaxBee',
    description: 'Simplify your tax returns with TaxBee. File ITR, claim deductions, and manage tax documents seamlessly.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#fbbf24',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}