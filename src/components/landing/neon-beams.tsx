'use client'

// Light-mode neon beams — same geometry, colors shifted to show on white.
// Each beam: outer bloom → inner glow → sharp center line.

const BEAMS = [
  {
    d: 'M -80 820 C 250 520 750 280 1540 60',
    bloom: 'rgba(120, 200, 20,  0.18)',
    glow:  'rgba(100, 180, 0,   0.40)',
    line:  '#7ab800',
    bw: 28, iw: 8, cw: 1.5,
  },
  {
    d: 'M -60 860 C 200 560 680 320 1540 140',
    bloom: 'rgba(0,  180, 140, 0.18)',
    glow:  'rgba(0,  160, 120, 0.40)',
    line:  '#00a882',
    bw: 24, iw: 7, cw: 1.5,
  },
  {
    d: 'M -40 900 C 160 600 620 360 1540 220',
    bloom: 'rgba(0,  150, 210, 0.18)',
    glow:  'rgba(0,  130, 200, 0.40)',
    line:  '#0090c8',
    bw: 22, iw: 6, cw: 1.5,
  },
  {
    // Brightest center beam — slightly cooler white-blue
    d: 'M 0 920 C 320 580 880 300 1540 80',
    bloom: 'rgba(80, 120, 200, 0.22)',
    glow:  'rgba(60, 100, 200, 0.45)',
    line:  '#5080d0',
    bw: 32, iw: 10, cw: 2.0,
  },
  {
    d: 'M 60 950 C 420 640 980 360 1540 160',
    bloom: 'rgba(80,  100, 200, 0.16)',
    glow:  'rgba(60,  80,  190, 0.36)',
    line:  '#6070c0',
    bw: 22, iw: 6, cw: 1.5,
  },
  {
    d: 'M 200 960 C 580 700 1080 400 1540 260',
    bloom: 'rgba(130, 40,  200, 0.16)',
    glow:  'rgba(110, 20,  190, 0.36)',
    line:  '#8020c8',
    bw: 24, iw: 7, cw: 1.5,
  },
  {
    d: 'M 340 980 C 700 760 1180 480 1540 360',
    bloom: 'rgba(200, 20,  160, 0.15)',
    glow:  'rgba(180, 10,  140, 0.34)',
    line:  '#c010a0',
    bw: 22, iw: 6, cw: 1.5,
  },
  {
    // Subtle outer lime — fills upper-right corner
    d: 'M -120 760 C 300 440 820 200 1540 -40',
    bloom: 'rgba(120, 200, 20,  0.10)',
    glow:  'rgba(100, 180, 0,   0.22)',
    line:  '#90c000',
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
