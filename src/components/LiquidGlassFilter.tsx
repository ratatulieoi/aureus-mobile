const LiquidGlassFilter = () => (
  <svg className="liquid-glass-filter" aria-hidden="true" focusable="false">
    <defs>
      <filter id="container-glass" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.008"
          numOctaves="2"
          seed="92"
          stitchTiles="stitch"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="0.02" result="blur" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blur"
          scale="40"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      <filter
        id="btn-glass"
        x="0"
        y="0"
        width="1"
        height="1"
        filterUnits="objectBoundingBox"
        primitiveUnits="objectBoundingBox"
      >
        <feImage
          href="/brand/liquid-glass-button-map.png"
          x="0"
          y="0"
          width="1"
          height="1"
          preserveAspectRatio="none"
          result="map"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
        <feDisplacementMap
          in="blur"
          in2="map"
          scale="1"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
);

export default LiquidGlassFilter;
