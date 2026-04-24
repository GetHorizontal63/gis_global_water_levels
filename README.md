# Global Water Level Explorer

An interactive, browser-only GIS tool for exploring how rising sea levels
reshape the planet's coastlines. Pan anywhere on Earth, raise the water
level, and watch real terrain flood in real time.

Stack: **HTML + CSS + JavaScript datasets + Leaflet** (CDN). No build
step, no backend, no database, just static files that work on your browser 
right now!

## What it does

- **Real global elevation**: pulls Mapzen / AWS Terrain Tiles
  (terrain-RGB) on demand, decodes each pixel to meters, and paints a
  flood mask over the actual terrain, not a cartoon.
- **Drag the slider** (0–1000 m) to raise or lower the sea anywhere on
  Earth; the mask re-renders in real time with no re-download.
- **Type a precise level** directly into the readout for exact values.
- **Anti-aliased coastline**: tiles are super-sampled at 2× and
  bilinear-filtered so flooded edges stay smooth instead of pixelated.
- **Scenario presets**: king tide, IPCC 2100 pathways, storm surge,
  worst-case ice-sheet collapse.
- **Jump-to landmarks**: 40+ preset cities / natural landmarks grouped
  by category in a dropdown.
- **Free-form lat/lon entry**: jump anywhere by typing coordinates
  (decimal, DMS, or `40.71N 74.01W` style, all parsed).
- **Live impact stats**: % of *land* in view that's underwater (open
  ocean is excluded), plus a list of inundated landmarks sorted by
  depth.
- **Hover readout**: elevation and local flood depth at the cursor.
- **Metric / imperial toggle** for the level readout and tick labels.
- **Layer controls**: toggle the flood overlay and tune its opacity.

## Files

```
Water_Level_Viz/
├── index.html          — page shell + CDN references
├── styles.css          — orange/cream Bahnschrift theme, responsive layout
├── app.js              — map, custom GridLayer flood renderer, UI wiring
└── data/
    ├── landmarks.js    — worldwide points of interest
    └── scenarios.js    — preset water-level narratives
```

### Dataset formats (plain JS — no CSV)

**`landmarks.js`** publishes `window.LANDMARKS` — an array of
`{ id, name, country, category, lat, lon, elevation }` records. The app
also live-samples elevation from the terrain tile under each marker as
tiles load, so inundation status stays in sync with what's drawn.

**`scenarios.js`** publishes `window.SCENARIOS` — preset
`{ id, label, level, note }` entries rendered as scenario buttons.

## How the terrain works

The layer `FloodLayer` (in `app.js`) is a custom `L.GridLayer`. For each
map tile it:

1. Fetches
   `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`
   (with `crossOrigin: 'anonymous'` so pixel data is readable).
2. Draws it to an offscreen canvas and reads the raw pixels.
3. Decodes each pixel: `elevation_m = R*256 + G + B/256 − 32768`.
4. Paints the visible tile canvas at 2× resolution with bilinear
   sampling: flooded pixels get a depth-coloured blue, dry pixels stay
   transparent.

The decoded pixel buffer stays cached on the tile element, so slider
updates only **repaint**, they do not re-download. Dragging the slider
stays smooth.

## Browser support

- Modern Chromium (Chrome, Edge, Brave), Firefox, and Safari all work.
- Requires `Canvas.getImageData` and ES2017+ (`async`/`await`).
- The auto-shrinking level readout uses CSS `field-sizing: content`;
  older browsers fall back to a fixed-width input.

## Credits

- Terrain tiles — Mapzen / AWS Terrain Tiles public dataset
  (https://registry.opendata.aws/terrain-tiles/)
- Basemap — CARTO Dark Matter + OpenStreetMap contributors
- Map engine — Leaflet (MIT)
