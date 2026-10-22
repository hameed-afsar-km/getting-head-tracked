import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
