import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'AppSisbenValledupar',
  description: 'Dashboard administrativo AppSisbenValledupar',
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