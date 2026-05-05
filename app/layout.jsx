import { Providers } from '@/components/shared/Providers';
import './globals.css';

export const metadata = {
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
