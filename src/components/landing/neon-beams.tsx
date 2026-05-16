'use client'

// Mirror iridescent beams — same geometry, palette shifted from neon to pearl/silver.
// Evokes light refracting across a mirror surface: silver → ice blue → violet → rose → champagne.

const BEAMS = [
  {
    // Silver mist
    d: 'M -80 820 C 250 520 750 280 1540 60',
    bloom: 'rgba(168, 184, 204, 0.18)',
    glow:  'rgba(148, 168, 192, 0.40)',
    line:  '#A8B8CC',
    bw: 28, iw: 8, cw: 1.5,
  },
  {
    // Ice pearl
    d: 'M -60 860 C 200 560 680 320 1540 140',
    bloom: 'rgba(136, 188, 220, 0.18)',
    glow:  'rgba(110, 168, 210, 0.40)',
    line:  '#88BCDC',
    bw: 24, iw: 7, cw: 1.5,
  },
  {
    // Glacier blue
    d: 'M -40 900 C 160 600 620 360 1540 220',
    bloom: 'rgba(112, 168, 224, 0.18)',
    glow:  'rgba(88, 150, 216, 0.40)',
    line:  '#70A8E0',
    bw: 22, iw: 6, cw: 1.5,
  },
  {
    // Mirror chrome — brightest center beam, the specular highlight
    d: 'M 0 920 C 320 580 880 300 1540 80',
    bloom: 'rgba(154, 174, 216, 0.24)',
    glow:  'rgba(134, 158, 208, 0.48)',
    line:  '#9AAED8',
    bw: 32, iw: 10, cw: 2.0,
  },
  {
    // Soft violet
    d: 'M 60 950 C 420 640 980 360 1540 160',
    bloom: 'rgba(152, 144, 204, 0.16)',
    glow:  'rgba(136, 128, 196, 0.36)',
    line:  '#9890CC',
    bw: 22, iw: 6, cw: 1.5,
  },
  {
    // Lavender
    d: 'M 200 960 C 580 700 1080 400 1540 260',
    bloom: 'rgba(176, 152, 200, 0.16)',
    glow:  'rgba(160, 136, 192, 0.36)',
    line:  '#B098C8',
    bw: 24, iw: 7, cw: 1.5,
  },
  {
    // Rose silver
    d: 'M 340 980 C 700 760 1180 480 1540 360',
    bloom: 'rgba(200, 160, 184, 0.15)',
    glow:  'rgba(184, 144, 168, 0.34)',
    line:  '#C8A0B8',
    bw: 22, iw: 6, cw: 1.5,
  },
  {
    // Champagne — outer fill, subtle warmth against the cool silver
    d: 'M -120 760 C 300 440 820 200 1540 -40',
    bloom: 'rgba(212, 196, 176, 0.10)',
    glow:  'rgba(196, 180, 160, 0.22)',
    line:  '#D4C4B0',
    bw: 18, iw: 5, cw: 1.0,
  },
]

export default function NeonBeams() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden="true"
    >
      <defs>
        <filter id="bloom-outer" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
          </feMerge>
        </filter>
        <filter id="bloom-inner" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Pass 1: outer bloom */}
      {BEAMS.map((b, i) => (
        <path key={`bloom-${i}`} d={b.d} fill="none" stroke={b.bloom}
          strokeWidth={b.bw} filter="url(#bloom-outer)" strokeLinecap="round" />
      ))}

      {/* Pass 2: inner glow */}
      {BEAMS.map((b, i) => (
        <path key={`glow-${i}`} d={b.d} fill="none" stroke={b.glow}
          strokeWidth={b.iw} filter="url(#bloom-inner)" strokeLinecap="round" />
      ))}

      {/* Pass 3: bright center line */}
      {BEAMS.map((b, i) => (
        <path key={`line-${i}`} d={b.d} fill="none" stroke={b.line}
          strokeWidth={b.cw} strokeLinecap="round" opacity={0.85} />
      ))}
    </svg>
  )
}
