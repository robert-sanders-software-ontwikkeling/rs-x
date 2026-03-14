import * as React from 'react';

export function HeroGraphic() {
  return (
    <svg
      className="heroGraphic"
      viewBox="0 0 820 560"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Change flows into model, updates expression, and produces output"
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      <defs>
        <clipPath id="rsxCanvasClip" clipPathUnits="userSpaceOnUse">
          <rect x="0" y="0" width="820" height="560" rx="0" />
        </clipPath>

        <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="16"
            floodColor="var(--heroShadow)"
          />
        </filter>

        <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-2)" />
        </linearGradient>

        <radialGradient id="heroGlowBlue" cx="50%" cy="52%" r="96%">
          <stop offset="0%" stopColor="var(--heroBgGlowA)" stopOpacity="0.88" />
          <stop
            offset="42%"
            stopColor="var(--heroBgGlowB)"
            stopOpacity="0.48"
          />
          <stop
            offset="74%"
            stopColor="var(--heroBgGlowB)"
            stopOpacity="0.16"
          />
          <stop offset="100%" stopColor="var(--heroBgGlowC)" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="heroGlowTeal" cx="70%" cy="62%" r="88%">
          <stop offset="0%" stopColor="var(--heroBgGlowD)" stopOpacity="0.56" />
          <stop
            offset="46%"
            stopColor="var(--heroBgGlowE)"
            stopOpacity="0.26"
          />
          <stop
            offset="78%"
            stopColor="var(--heroBgGlowE)"
            stopOpacity="0.08"
          />
          <stop offset="100%" stopColor="var(--heroBgGlowC)" stopOpacity="0" />
        </radialGradient>

        <radialGradient
          id="fadeAlpha"
          gradientUnits="userSpaceOnUse"
          cx="410"
          cy="285"
          r="500"
        >
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="58%" stopColor="white" stopOpacity="0.96" />
          <stop offset="82%" stopColor="white" stopOpacity="0.42" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>

        <mask
          id="bgFadeMask"
          maskUnits="userSpaceOnUse"
          x="-80"
          y="-140"
          width="980"
          height="820"
        >
          <rect
            x="-80"
            y="-140"
            width="980"
            height="820"
            fill="url(#fadeAlpha)"
          />
        </mask>

        <marker
          id="arrow"
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          orient="auto"
        >
          <path d="M 1 1 L 11 6 L 1 11 Z" fill="var(--flow)" />
        </marker>

        <filter id="dotGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="pulseGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="2.8"
            result="pblur"
          />
          <feMerge>
            <feMergeNode in="pblur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <style>{`
          .label {
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          }

          .flow {
            stroke: var(--flow);
            stroke-width: 4;
            stroke-linecap: round;
            fill: none;
            stroke-dasharray: 10 10;
            animation: dash 2.1s linear infinite;
          }

          .flowSoft {
            stroke: var(--flow-soft);
            stroke-width: 4;
            stroke-linecap: round;
            fill: none;
            stroke-dasharray: 10 10;
            animation: dash 2.1s linear infinite;
            opacity: 0.55;
          }

          @keyframes dash {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -170; }
          }

          .dot {
            fill: var(--flow);
          }

          .dotHalo {
            fill: var(--flow);
            opacity: 0.22;
          }

          .pulseRing {
            fill: none;
            stroke: var(--flow);
            stroke-width: 10;
            opacity: 0;
          }

          .pulseRing2 {
            fill: none;
            stroke: var(--flow-soft);
            stroke-width: 7;
            opacity: 0;
          }

          .pulsePing {
            fill: none;
            stroke: var(--flow);
            stroke-width: 3.5;
            opacity: 0;
          }
        `}</style>
      </defs>

      <g aria-hidden="true" mask="url(#bgFadeMask)">
        <rect
          x="-60"
          y="-120"
          width="940"
          height="760"
          fill="url(#heroGlowBlue)"
        />
        <rect
          x="-36"
          y="-88"
          width="892"
          height="704"
          fill="url(#heroGlowTeal)"
        />
      </g>

      <path
        className="flow"
        d="M 410 152 C 410 195, 410 220, 410 245"
        markerEnd="url(#arrow)"
      />

      <path
        className="flowSoft"
        d="M 375 300 C 315 320, 275 340, 255 370 S 220 435, 270 480"
        markerEnd="url(#arrow)"
      />

      <path
        className="flow"
        d="M 355 485 C 420 510, 505 510, 565 485 S 675 430, 670 390"
        markerEnd="url(#arrow)"
      />

      {/* MOVING DOTS */}
      <g filter="url(#dotGlow)" opacity="0">
        <animateMotion
          id="seg1"
          begin="0s;seg3.end"
          dur="0.95s"
          repeatCount="1"
          path="M 410 152 C 410 195, 410 220, 410 245"
        />
        <animate
          attributeName="opacity"
          begin="0s;seg3.end"
          dur="0.95s"
          values="0.55;1;0.55;0"
          keyTimes="0;0.2;0.8;1"
          repeatCount="1"
        />
        <circle className="dotHalo" r="9" cx="0" cy="0" />
        <circle className="dot" r="4.5" cx="0" cy="0" />
      </g>

      <g filter="url(#dotGlow)" opacity="0">
        <animateMotion
          id="seg2"
          begin="seg1.end"
          dur="1.15s"
          repeatCount="1"
          path="M 375 300 C 315 320, 275 340, 255 370 S 220 435, 270 480"
        />
        <animate
          attributeName="opacity"
          begin="seg1.end"
          dur="1.15s"
          values="0.55;1;0.55;0"
          keyTimes="0;0.2;0.8;1"
          repeatCount="1"
        />
        <circle className="dotHalo" r="9" cx="0" cy="0" />
        <circle className="dot" r="4.5" cx="0" cy="0" />
      </g>

      <g filter="url(#dotGlow)" opacity="0">
        <animateMotion
          id="seg3"
          begin="seg2.end"
          dur="1.15s"
          repeatCount="1"
          path="M 355 485 C 420 510, 505 510, 565 485 S 675 430, 670 390"
        />
        <animate
          attributeName="opacity"
          begin="seg2.end"
          dur="1.15s"
          values="0.55;1;0.55;0"
          keyTimes="0;0.2;0.8;1"
          repeatCount="1"
        />
        <circle className="dotHalo" r="9" cx="0" cy="0" />
        <circle className="dot" r="4.5" cx="0" cy="0" />
      </g>

      <g filter="url(#shadow)">
        <rect
          x="305"
          y="70"
          width="210"
          height="82"
          rx="26"
          fill="var(--surface-solid)"
          stroke="var(--border)"
        />
        <g transform="translate(328 96)">
          <path
            d="M 12 0 L 14 8 L 22 10 L 14 12 L 12 20 L 10 12 L 2 10 L 10 8 Z"
            fill="var(--brand-2)"
          />
        </g>
        <text
          x="410"
          y="108"
          textAnchor="middle"
          className="label"
          fontSize="18"
          fontWeight="950"
          fill="var(--text)"
        >
          change
        </text>
        <text
          x="410"
          y="132"
          textAnchor="middle"
          className="label"
          fontSize="12"
          fontWeight="700"
          fill="var(--muted)"
        >
          happens
        </text>
      </g>

      <g aria-hidden="true" filter="url(#pulseGlow)">
        <circle className="pulseRing" cx="410" cy="300" r="98">
          <animate
            attributeName="opacity"
            begin="seg1.end"
            dur="0.70s"
            values="0;0.62;0"
            repeatCount="1"
          />
          <animate
            attributeName="r"
            begin="seg1.end"
            dur="0.70s"
            values="96;128"
            repeatCount="1"
          />
        </circle>

        <circle className="pulseRing2" cx="410" cy="300" r="98">
          <animate
            attributeName="opacity"
            begin="seg1.end"
            dur="0.84s"
            values="0;0.38;0"
            repeatCount="1"
          />
          <animate
            attributeName="r"
            begin="seg1.end"
            dur="0.84s"
            values="96;146"
            repeatCount="1"
          />
        </circle>

        <circle className="pulsePing" cx="410" cy="300" r="96">
          <animate
            attributeName="opacity"
            begin="seg1.end"
            dur="0.34s"
            values="0;0.55;0"
            repeatCount="1"
          />
        </circle>
      </g>

      <g filter="url(#shadow)">
        <circle cx="410" cy="300" r="92" fill="url(#brandGrad)" />
        <text
          x="410"
          y="295"
          textAnchor="middle"
          className="label"
          fontSize="26"
          fontWeight="950"
          fill="var(--onBrand)"
        >
          model
        </text>
        <text
          x="410"
          y="323"
          textAnchor="middle"
          className="label"
          fontSize="13"
          fontWeight="800"
          fill="var(--onBrandSoft)"
        >
          changes
        </text>
      </g>

      <g filter="url(#shadow)">
        <rect
          x="150"
          y="430"
          width="270"
          height="110"
          rx="32"
          fill="var(--surface-solid)"
          stroke="var(--border)"
        />
        <text
          x="285"
          y="475"
          textAnchor="middle"
          className="label"
          fontSize="20"
          fontWeight="950"
          fill="var(--text)"
        >
          expression
        </text>
        <text
          x="285"
          y="503"
          textAnchor="middle"
          className="label"
          fontSize="12"
          fontWeight="700"
          fill="var(--muted)"
        >
          updates
        </text>
      </g>

      <g filter="url(#shadow)">
        <rect
          x="520"
          y="350"
          width="250"
          height="110"
          rx="32"
          fill="var(--surface-solid)"
          stroke="var(--border)"
        />
        <text
          x="645"
          y="395"
          textAnchor="middle"
          className="label"
          fontSize="20"
          fontWeight="950"
          fill="var(--text)"
        >
          output
        </text>
        <text
          x="645"
          y="423"
          textAnchor="middle"
          className="label"
          fontSize="12"
          fontWeight="700"
          fill="var(--muted)"
        >
          changes
        </text>
      </g>
    </svg>
  );
}
