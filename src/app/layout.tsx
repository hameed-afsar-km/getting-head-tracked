import type { Metadata } from 'next';
import { Inter, Orbitron, Rajdhani } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-orbitron',
  display: 'swap',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IRON MAN — Immersive Experience',
  description: 'An immersive Iron Man experience with head-tracked 3D parallax. Explore the suit, the garage, and the arc reactor.',
  openGraph: {
    title: 'IRON MAN — Immersive Head-Tracked 3D Experience',
    description: 'Experience Iron Man like never before with real-time head tracking.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IRON MAN — Immersive Experience',
    description: 'Head-tracked 3D Iron Man experience.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} ${rajdhani.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
