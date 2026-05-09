import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror.",
  description: "Chat-first investment portfolio tracker for LATAM investors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* ── Ambient glow blobs — fixed behind all content ───────────────── */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Blue blob — top left */}
          <div
            className="animate-blob"
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-10%',
              width: '70vw',
              height: '70vw',
              maxWidth: '800px',
              maxHeight: '800px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at center, rgba(147, 197, 253, 0.45) 0%, transparent 65%)',
              filter: 'blur(1px)',
            }}
          />
          {/* Purple blob — bottom right */}
          <div
            className="animate-blob"
            style={{
              position: 'absolute',
              bottom: '-20%',
              right: '-15%',
              width: '65vw',
              height: '65vw',
              maxWidth: '900px',
              maxHeight: '900px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at center, rgba(196, 181, 253, 0.40) 0%, transparent 65%)',
              filter: 'blur(1px)',
              animationDelay: '-4s',
              animationDuration: '15s',
            }}
          />
          {/* Mint blob — center-right */}
          <div
            className="animate-blob"
            style={{
              position: 'absolute',
              top: '35%',
              right: '20%',
              width: '40vw',
              height: '40vw',
              maxWidth: '500px',
              maxHeight: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at center, rgba(110, 231, 183, 0.30) 0%, transparent 65%)',
              filter: 'blur(1px)',
              animationDelay: '-8s',
              animationDuration: '18s',
            }}
          />
          {/* Subtle noise texture overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.025,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px',
            }}
          />
        </div>

        {/* ── Content — above blobs ──────────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
