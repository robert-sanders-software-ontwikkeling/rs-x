import { readFileSync } from 'fs';
import { join } from 'path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  const svgData = readFileSync(join(process.cwd(), 'public/rsx-logo.svg'));
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}`;

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Glow backdrop */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(11,102,255,0.15) 0%, rgba(43,182,169,0.08) 50%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
        }}
      />
      {/* Logo */}
      <img
        src={logoSrc}
        width={120}
        height={120}
        style={{ marginBottom: 32 }}
      />
      {/* Title */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #0b66ff 0%, #2bb6a9 100%)',
          backgroundClip: 'text',
          color: 'transparent',
          letterSpacing: '-2px',
          marginBottom: 20,
          display: 'flex',
        }}
      >
        rs-x
      </div>
      {/* Tagline */}
      <div
        style={{
          fontSize: 28,
          color: '#8b949e',
          textAlign: 'center',
          maxWidth: 700,
          lineHeight: 1.4,
          display: 'flex',
        }}
      >
        Declarative reactivity for JavaScript &amp; TypeScript
      </div>
    </div>,
    { ...size },
  );
}
