/** @returns {import('next').MetadataRoute.Manifest} */
export default function manifest() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );

  return {
    id: `${base}/`,
    name: 'Akheen',
    short_name: 'Akheen',
    description: 'Akheen',
    start_url: `${base}/`,
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'natural',
    theme_color: '#000000',
    background_color: '#ffffff',
    icons: [
      {
        src: `${base}/web-app-manifest-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${base}/web-app-manifest-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
