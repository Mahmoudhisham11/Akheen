import { Providers } from '@/components/shared/Providers';
import './globals.css';

export const metadata = {
  applicationName: 'Akheen',
  appleWebApp: {
    capable: true,
    title: 'Akheen',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
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
