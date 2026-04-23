/* =========================================================================
 * Global Water Level Explorer
 *
 * Uses publicly-hosted Mapzen "Terrarium" terrain-RGB tiles on AWS
 * (https://registry.opendata.aws/terrain-tiles/) to get real global
 * elevation data. Each tile pixel is decoded as:
 *
 *     elevation_meters = (R * 256) + G + (B / 256) - 32768
 *
 * A custom Leaflet GridLayer fetches these tiles, caches the decoded pixel
 * buffer, and re-paints a flood mask on top whenever the water level
 * changes — no network re-fetch required while dragging the slider.
 * ========================================================================= */

(function () {
    'use strict';

    // --- Map setup ---------------------------------------------------------
    const map = L.map('map', {
        center: [20, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 14,
        worldCopyJump: true,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
            '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Loading indicator.
    const loadingPill = L.DomUtil.create('div', 'loading-pill', document.querySelector('.map-wrap'));
    loadingPill.textContent = 'Loading terrain…';

    // --- Flood GridLayer ---------------------------------------------------
    // Downloads terrarium tiles, decodes them, and paints a flood mask
    // into each tile's canvas. The decoded ImageData is kept on the tile
    // element so slider updates only require a re-paint.
    const FloodLayer = L.GridLayer.extend({
        options: { tileSize: 256, opacity: 0.75, crossOrigin: 'anonymous', maxNativeZoom: 14 },

        initialize: function (opts) {
            L.setOptions(this, opts);
            this._level = 0;
            this._pending = 0;
        },

        setLevel: function (level) {
            this._level = level;
            this._repaintAll();
        },

        _repaintAll: function () {
            let flooded = 0, land = 0;
            for (const key in this._tiles) {
                const tile = this._tiles[key];
                const entry = tile.el && tile.el._entry;
                if (entry && entry.srcData) {
                    const s = this._paintEntry(entry);
                    flooded += s.flooded;
                    land    += s.land;
                }
            }
            this.fire('statschange', {
                // Percent of *land* that is newly flooded — open ocean excluded.
                pct: land ? (flooded / land) * 100 : 0,
                land, flooded
            });
        },

        createTile: function (coords, done) {
            const canvas = L.DomUtil.create('canvas', 'leaflet-tile');
            const size = this.getTileSize();
            // Render the flood canvas at 2× its CSS size so coastlines get
            // bilinear-smoothed by the browser instead of showing the
            // native DEM staircase.
            const SS = 2;
            canvas.width  = size.x * SS;
            canvas.height = size.y * SS;
            canvas.style.width  = size.x + 'px';
            canvas.style.height = size.y + 'px';

            const entry = {
                canvas,
                ctx: canvas.getContext('2d'),
                srcData: null,
                coords,
                ss: SS
            };
            canvas._entry = entry;

            // Out-of-range tile → just a blank canvas.
            const maxTile = Math.pow(2, coords.z);
            if (coords.z < 0 || coords.z > 15 ||
                coords.y < 0 || coords.y >= maxTile) {
                setTimeout(() => done(null, canvas), 0);
                return canvas;
            }

            // Wrap x around the world (tiles at z=3 have x in [0,7]; for x=8 we want x=0).
            const wrappedX = ((coords.x % maxTile) + maxTile) % maxTile;

            const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${coords.z}/${wrappedX}/${coords.y}.png`;
            const img = new Image();
            img.crossOrigin = 'anonymous';

            this._pending++;
            this._updateLoading();

            const finish = () => {
                this._pending = Math.max(0, this._pending - 1);
                this._updateLoading();
                done(null, canvas);
            };

            img.onload = () => {
                const off = document.createElement('canvas');
                off.width = 256; off.height = 256;
                const octx = off.getContext('2d');
                octx.drawImage(img, 0, 0);
                try {
                    entry.srcData = octx.getImageData(0, 0, 256, 256);
                    this._paintEntry(entry);
                    // Also bump the stats once this tile is in.
                    this.fire('tileloaded');
                } catch (e) {
                    console.warn('Flood tile decode failed', e);
                }
                finish();
            };
            img.onerror = () => { finish(); };
            img.src = url;

            return canvas;
        },

        _updateLoading: function () {
            if (this._pending > 0) loadingPill.classList.add('active');
            else loadingPill.classList.remove('active');
        },

        // Paint a single tile entry; returns {flooded, land} counts.
        // Runs at 2× the terrain resolution with bilinear sampling so the
        // coastline gets smooth anti-aliased edges instead of staircase.
        _paintEntry: function (entry) {
            const src   = entry.srcData;
            const ss    = entry.ss || 1;
            const W     = 256 * ss;
            const level = this._level;
            const out   = entry.ctx.createImageData(W, W);
            const sd    = src.data, o = out.data;

            let flooded = 0, land = 0;

            // Bilinear elevation sample in DEM-pixel space (0..255).
            const sampleZ = (fx, fy) => {
                if (fx < 0) fx = 0; else if (fx > 255) fx = 255;
                if (fy < 0) fy = 0; else if (fy > 255) fy = 255;
                const x0 = fx | 0, y0 = fy | 0;
                const x1 = x0 < 255 ? x0 + 1 : 255;
                const y1 = y0 < 255 ? y0 + 1 : 255;
                const tx = fx - x0, ty = fy - y0;
                const i00 = (y0 * 256 + x0) * 4;
                const i10 = (y0 * 256 + x1) * 4;
                const i01 = (y1 * 256 + x0) * 4;
                const i11 = (y1 * 256 + x1) * 4;
                const dec = k => (sd[k] * 256) + sd[k + 1] + (sd[k + 2] / 256) - 32768;
                const a = dec(i00), b = dec(i10), c = dec(i01), d = dec(i11);
                return (a * (1 - tx) + b * tx) * (1 - ty) +
                       (c * (1 - tx) + d * tx) * ty;
            };

            const inv = 1 / ss;
            for (let py = 0; py < W; py++) {
                const fy = (py + 0.5) * inv - 0.5;
                for (let px = 0; px < W; px++) {
                    const fx = (px + 0.5) * inv - 0.5;
                    const z  = sampleZ(fx, fy);
                    const k  = (py * W + px) * 4;

                    const isOcean = z <= 0;
                    if (!isOcean) land++;

                    if (z <= level) {
                        const depth = level - z;
                        const t = Math.min(1, depth / 25);
                        o[k]     = Math.round( 90 * (1 - t) +  10 * t);
                        o[k + 1] = Math.round(185 * (1 - t) +  50 * t);
                        o[k + 2] = Math.round(235 * (1 - t) + 130 * t);
                        o[k + 3] = isOcean ? (level <= 0 ? 0 : 120) : 210;
                        if (!isOcean) flooded++;
                    } else {
                        o[k + 3] = 0;
                    }
                }
            }
            entry.ctx.putImageData(out, 0, 0);
            return { flooded, land };
        },

        // Bilinear-ish elevation sample at a given lat/lng from the currently
        // loaded tile (if any).
        sampleElevation: function (latlng) {
            if (!this._map) return null;
            const z = this._tileZoom;
            if (z == null) return null;
            const p = this._map.project(latlng, z);
            const maxTile = Math.pow(2, z);
            const worldPx = maxTile * 256;
            // Wrap x in world-pixel space.
            const wrappedPx = ((p.x % worldPx) + worldPx) % worldPx;
            const tx = Math.floor(wrappedPx / 256);
            const ty = Math.floor(p.y / 256);
            const px = Math.min(255, Math.max(0, Math.floor(wrappedPx - tx * 256)));
            const py = Math.min(255, Math.max(0, Math.floor(p.y - ty * 256)));
            // Leaflet's internal tile key includes the *unwrapped* coords.x,
            // so we need to search tiles at this y/z with matching wrapped x.
            for (const key in this._tiles) {
                const t = this._tiles[key];
                if (!t.coords || t.coords.z !== z || t.coords.y !== ty) continue;
                const cx = ((t.coords.x % maxTile) + maxTile) % maxTile;
                if (cx !== tx) continue;
                const entry = t.el && t.el._entry;
                if (!entry || !entry.srcData) return null;
                const i = (py * 256 + px) * 4;
                const d = entry.srcData.data;
                return (d[i] * 256) + d[i + 1] + (d[i + 2] / 256) - 32768;
            }
            return null;
        }
    });

    const floodLayer = new FloodLayer({ opacity: 0.75 });
    floodLayer.addTo(map);

    // --- Landmarks (no markers; used for jump-to + impact stats only) -----
    const landmarkRecords = LANDMARKS.map(m => ({ def: m, _liveElev: null }));

    function updateLandmarks() {
        // Keep each record's live-sampled elevation fresh so the impact
        // list reflects what's actually under the current map tiles.
        for (const rec of landmarkRecords) {
            const sampled = floodLayer.sampleElevation(L.latLng(rec.def.lat, rec.def.lon));
            rec._liveElev = (sampled != null && isFinite(sampled)) ? sampled : rec.def.elevation;
        }
    }

    // --- State & UI wiring -------------------------------------------------
    // state.level is always stored in METERS. Units only affect the display.
    const state = { level: 0, units: 'metric' };

    const M_TO_FT = 3.28084;
    const U = {
        metric:   { label: 'm',  shortSuffix: ' m',  toDisp: m => m,            fromDisp: v => v,            decimals: 2 },
        imperial: { label: 'ft', shortSuffix: ' ft', toDisp: m => m * M_TO_FT,   fromDisp: v => v / M_TO_FT,  decimals: 1 }
    };
    const fmtLevel = m => U[state.units].toDisp(m).toFixed(U[state.units].decimals);
    const fmtElev  = m => `${U[state.units].toDisp(m).toFixed(U[state.units].decimals)}${U[state.units].shortSuffix}`;

    const slider       = document.getElementById('levelSlider');
    const opacitySld   = document.getElementById('opacitySlider');
    const levelValue   = document.getElementById('levelValue');
    const levelUnit    = document.getElementById('levelUnit');
    const sliderLabels = document.getElementById('sliderLabels');
    const scenarioNote = document.getElementById('scenarioNote');
    const statArea     = document.getElementById('statArea');
    const statLMs      = document.getElementById('statLandmarks');
    const statLMsTot   = document.getElementById('statLandmarksTotal');
    const affectedUL   = document.getElementById('affectedList');
    const scenariosDiv = document.getElementById('scenarios');
    const mapBadge     = document.getElementById('mapBadge');
    const jumpSelect   = document.getElementById('jumpSelect');
    const unitButtons  = document.querySelectorAll('.unit-btn');
    const depthMid     = document.getElementById('depthMid');
    const depthMax     = document.getElementById('depthMax');

    statLMsTot.textContent = String(LANDMARKS.length);

    // Preset scenarios. Button labels re-render when units change.
    SCENARIOS.forEach(s => {
        const btn = document.createElement('button');
        btn.dataset.level = s.level;
        btn.dataset.rawLabel = s.label;  // e.g. "2100 High (+2 m)"
        btn.addEventListener('click', () => setLevel(s.level, s.note));
        scenariosDiv.appendChild(btn);
    });

    function renderScenarioLabels() {
        for (const btn of scenariosDiv.querySelectorAll('button')) {
            const lvl = parseFloat(btn.dataset.level);
            // Extract the prefix before the parenthetical numeric bit for a clean relabel.
            const raw = btn.dataset.rawLabel;
            const base = raw.replace(/\s*\([^)]*\)\s*$/, '');
            const sign = lvl > 0 ? '+' : (lvl < 0 ? '−' : '');
            const mag  = Math.abs(lvl);
            const disp = U[state.units].toDisp(mag);
            const dec  = state.units === 'metric' ? (mag < 10 ? 1 : 0) : 0;
            btn.textContent = `${base} (${sign}${disp.toFixed(dec)}${U[state.units].shortSuffix.trim()})`;
        }
    }

    // Jump-to dropdown, grouped by category.
    (function populateJump() {
        const byCat = {};
        LANDMARKS.forEach(m => {
            (byCat[m.category] ||= []).push(m);
        });
        for (const cat of Object.keys(byCat).sort()) {
            const og = document.createElement('optgroup');
            og.label = cat.charAt(0).toUpperCase() + cat.slice(1);
            for (const m of byCat[cat].sort((a, b) => a.name.localeCompare(b.name))) {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.name} — ${m.country}`;
                og.appendChild(opt);
            }
            jumpSelect.appendChild(og);
        }
        jumpSelect.addEventListener('change', () => {
            const m = LANDMARKS.find(x => x.id === jumpSelect.value);
            if (m) {
                map.flyTo([m.lat, m.lon], 11, { duration: 1.2 });
            }
        });

        // ---- Free-form lat/lon entry ----
        const coordInput = document.getElementById('coordInput');
        const coordGo    = document.getElementById('coordGo');
        const coordHint  = document.getElementById('coordHint');
        const defaultHint = coordHint.textContent;

        // Accepts: "40.71, -74.00", "40.71 -74.00", "40.71N 74.00W",
        //          "40°42'46\"N 74°00'21\"W", etc.
        function parseCoords(raw) {
            if (!raw) return null;
            const s = raw.trim()
                .replace(/[°'"′″]/g, ' ')
                .replace(/,/g, ' ')
                .replace(/\s+/g, ' ');
            // Pull out N/S/E/W hemisphere markers if present.
            const hemi = { lat: 1, lon: 1 };
            const cleaned = s.replace(/([NSEW])/gi, (_, h) => {
                h = h.toUpperCase();
                if (h === 'S') hemi.lat = -1;
                if (h === 'W') hemi.lon = -1;
                return ' ';
            }).trim().replace(/\s+/g, ' ');
            const nums = cleaned.split(' ').map(Number).filter(n => !isNaN(n));
            if (nums.length < 2) return null;

            // Support DMS: lat as up to 3 numbers, lon as up to 3 numbers.
            const toDeg = parts => {
                const d = parts[0] || 0, m = parts[1] || 0, sec = parts[2] || 0;
                const sign = d < 0 ? -1 : 1;
                return sign * (Math.abs(d) + m / 60 + sec / 3600);
            };
            let lat, lon;
            if (nums.length === 2) {
                lat = nums[0]; lon = nums[1];
            } else if (nums.length === 4) {
                lat = toDeg(nums.slice(0, 2));
                lon = toDeg(nums.slice(2, 4));
            } else if (nums.length === 6) {
                lat = toDeg(nums.slice(0, 3));
                lon = toDeg(nums.slice(3, 6));
            } else {
                lat = nums[0]; lon = nums[1];
            }
            lat *= hemi.lat;
            lon *= hemi.lon;
            if (!isFinite(lat) || !isFinite(lon)) return null;
            if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
            return { lat, lon };
        }

        function jumpToCoords() {
            const c = parseCoords(coordInput.value);
            if (!c) {
                coordInput.classList.add('invalid');
                coordHint.classList.add('error');
                coordHint.textContent = 'Enter coordinates as "lat, lon" (e.g. 40.71, -74.00).';
                return;
            }
            coordInput.classList.remove('invalid');
            coordHint.classList.remove('error');
            coordHint.textContent = `Jumped to ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}.`;
            jumpSelect.value = '';
            map.flyTo([c.lat, c.lon], 11, { duration: 1.2 });
        }

        coordGo.addEventListener('click', jumpToCoords);
        coordInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); jumpToCoords(); }
        });
        coordInput.addEventListener('input', () => {
            if (coordInput.classList.contains('invalid')) {
                coordInput.classList.remove('invalid');
                coordHint.classList.remove('error');
                coordHint.textContent = defaultHint;
            }
        });
    })();

    function markActiveScenario(level) {
        for (const btn of scenariosDiv.querySelectorAll('button')) {
            btn.classList.toggle(
                'active',
                Math.abs(parseFloat(btn.dataset.level) - level) < 1e-6
            );
        }
    }

    function setLevel(level, note) {
        // Clamp to the configured slider range.
        level = Math.max(0, Math.min(1000, level));
        state.level = level;
        slider.value = level;   // slider always operates in meters internally
        levelValue.value = fmtLevel(level);
        if (note != null) scenarioNote.textContent = note;
        markActiveScenario(level);
        requestRender();
    }

    function applyUnits() {
        levelUnit.textContent = U[state.units].label;
        levelValue.value = fmtLevel(state.level);

        // Redraw slider tick labels in the current unit.
        const ticks = state.units === 'metric'
            ? [0, 250, 500, 750, 1000]
            : [0, 800, 1600, 2400, 3280];
        sliderLabels.innerHTML = ticks.map((v, i) => {
            const prefix = v === 0 ? '' : '+';
            const label  = v + (i === ticks.length - 1 ? '&nbsp;' + U[state.units].label : '');
            return `<span>${prefix}${label}</span>`;
        }).join('');

        // Slider always stores meters internally; range is 0–1000 m.
        slider.min = 0;
        slider.max = 1000;
        slider.step = state.units === 'metric' ? 0.25 : 0.1;

        // Number input bounds / step match the display units.
        levelValue.min  = 0;
        levelValue.max  = U[state.units].toDisp(1000).toFixed(0);
        levelValue.step = state.units === 'metric' ? 0.25 : 0.1;

        renderScenarioLabels();
        markActiveScenario(state.level);
        requestRender();
    }

    unitButtons.forEach(b => {
        b.addEventListener('click', () => {
            if (b.classList.contains('active')) return;
            unitButtons.forEach(x => x.classList.toggle('active', x === b));
            state.units = b.dataset.units;
            applyUnits();
        });
    });

    // Layer toggle + opacity.
    document.getElementById('toggleFlood').addEventListener('change', e => {
        if (e.target.checked) floodLayer.addTo(map); else floodLayer.remove();
    });
    opacitySld.addEventListener('input', () => {
        floodLayer.setOpacity(parseFloat(opacitySld.value));
    });

    // Slider with rAF throttling so dragging stays smooth.
    let pending = false;
    function requestRender() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; render(); });
    }
    slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        state.level = v;
        levelValue.value = fmtLevel(v);
        scenarioNote.textContent = 'Custom water level.';
        markActiveScenario(v);
        requestRender();
    });
    // Typed / spinner-entry in the big readout. User types in the current
    // display units; we convert back to meters for state.
    function commitTypedLevel() {
        const raw = parseFloat(levelValue.value);
        if (!isFinite(raw)) {
            levelValue.value = fmtLevel(state.level);
            return;
        }
        const meters = U[state.units].fromDisp(raw);
        setLevel(meters, 'Custom water level.');
    }
    levelValue.addEventListener('change', commitTypedLevel);
    levelValue.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commitTypedLevel(); levelValue.blur(); }
    });
    // Hover readout.
    map.on('mousemove', e => {
        const z = floodLayer.sampleElevation(e.latlng);
        if (z == null || !isFinite(z)) {
            mapBadge.textContent =
                `Lat ${e.latlng.lat.toFixed(3)}, Lon ${e.latlng.lng.toFixed(3)} — terrain loading…`;
        } else {
            const diff = state.level - z;
            const label = diff >= 0
                ? `flooded by ${fmtElev(diff)}`
                : `${fmtElev(-diff)} above water`;
            mapBadge.textContent =
                `Elev ${fmtElev(z)}  —  ${label}  ` +
                `(${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)})`;
        }
    });
    map.on('mouseout', () => {
        mapBadge.textContent = 'Hover the map to inspect elevation';
    });

    // Stats need to update when new tiles finish loading too.
    floodLayer.on('tileloaded', () => requestRender());
    floodLayer.on('statschange', ev => {
        statArea.textContent = ev.pct.toFixed(1);
    });

    // Recompute stats after pan/zoom settles (tile set changes).
    map.on('moveend', () => requestRender());

    // --- Render ------------------------------------------------------------
    function render() {
        floodLayer.setLevel(state.level);

        // Update the depth-scale tick labels to reflect the current level.
        // The flood painter caps color at a depth of 25 m, so that's our
        // effective "deep" anchor; otherwise use the current water level.
        const maxDepthM = Math.min(25, Math.max(state.level, 0.1));
        depthMid.textContent = fmtElev(maxDepthM / 2);
        depthMax.textContent = `\u2265 ${fmtElev(maxDepthM)}`;

        // Impacted landmarks (use live-sampled elevation if we have it).
        const impacted = [];
        for (const rec of landmarkRecords) {
            const elev = rec._liveElev != null ? rec._liveElev : rec.def.elevation;
            if (state.level >= elev) {
                impacted.push({ rec, depth: state.level - elev });
            }
        }
        impacted.sort((a, b) => b.depth - a.depth);

        statLMs.textContent = String(impacted.length);
        affectedUL.innerHTML = impacted.map(({ rec, depth }) =>
            `<li><span>${rec.def.name}, ${rec.def.country}</span>` +
            `<span class="depth">${fmtElev(depth)}</span></li>`
        ).join('');

        updateLandmarks();
    }

    // Initial paint.
    applyUnits();
    setLevel(0, SCENARIOS[0].note);
})();
