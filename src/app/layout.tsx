import type { Metadata } from 'next';
import { Anton, Chakra_Petch, Sora } from 'next/font/google';
import './globals.css';

const display = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const body = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

const tech = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-tech',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IRON MAN — Immersive Experience',
  description:
    'An immersive Iron Man experience with head-tracked 3D parallax. Explore the suit, the garage, and the arc reactor.',
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
      className={`${display.variable} ${body.variable} ${tech.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
