import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PMO Roadmap Checker',
  description: 'Vérifiez la conformité de vos feuilles de route PMO',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-navy text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
