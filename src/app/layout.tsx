import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'AppSisbén Valledupar',
  description: 'Dashboard administrativo AppSisbén Valledupar',
  icons: {
    icon: [
      {
        url: '/images/icono.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
    ],
    shortcut: ['/images/icono.ico'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}