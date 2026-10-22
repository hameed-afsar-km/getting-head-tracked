import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '3D Environment — Immersive Head-Tracked Experience',
  description:
    'An immersive 3D environment built from a Blender scene, with scroll-driven camera navigation and webcam-based head tracking for a window-like parallax effect.',
  openGraph: {
    title: '3D Immersive Environment',
    description: 'Scroll to explore, use head tracking to look through a virtual window.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: '#020408',
          color: '#f7fafc',
          overflowX: 'hidden',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
