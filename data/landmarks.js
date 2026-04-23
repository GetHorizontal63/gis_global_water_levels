/*
 * Landmarks Dataset — notable low-lying / coastal locations worldwide.
 *
 * Each record:
 *   { id, name, country, category, lat, lon, elevation (m above sea level) }
 *
 * Elevations are representative ground heights near the given coordinate
 * (approx. from public DEMs). The app also re-samples the live terrain-RGB
 * tile under each marker as tiles load, so inundation checks stay
 * consistent with whatever the flood overlay is showing.
 */
window.LANDMARKS = [
    // --- Americas ---
    { id: 'nyc',     name: 'Manhattan',         country: 'USA',        category: 'urban',          lat:  40.7580, lon:  -73.9855, elevation: 10 },
    { id: 'mia',     name: 'Miami Beach',       country: 'USA',        category: 'urban',          lat:  25.7907, lon:  -80.1300, elevation:  1 },
    { id: 'nola',    name: 'New Orleans',       country: 'USA',        category: 'urban',          lat:  29.9511, lon:  -90.0715, elevation: -1 },
    { id: 'sfo',     name: 'San Francisco',     country: 'USA',        category: 'urban',          lat:  37.7749, lon: -122.4194, elevation: 16 },
    { id: 'bos',     name: 'Boston',            country: 'USA',        category: 'urban',          lat:  42.3601, lon:  -71.0589, elevation:  5 },
    { id: 'hou',     name: 'Houston',           country: 'USA',        category: 'urban',          lat:  29.7604, lon:  -95.3698, elevation: 12 },
    { id: 'kennedy', name: 'Kennedy Space Ctr', country: 'USA',        category: 'infrastructure', lat:  28.5729, lon:  -80.6490, elevation:  3 },
    { id: 'rio',     name: 'Rio de Janeiro',    country: 'Brazil',     category: 'urban',          lat: -22.9068, lon:  -43.1729, elevation:  5 },
    { id: 'bel',     name: 'Belém',             country: 'Brazil',     category: 'urban',          lat:  -1.4558, lon:  -48.5039, elevation: 10 },
    { id: 'bue',     name: 'Buenos Aires',      country: 'Argentina',  category: 'urban',          lat: -34.6037, lon:  -58.3816, elevation: 25 },

    // --- Europe ---
    { id: 'ams',     name: 'Amsterdam',         country: 'Netherlands',category: 'critical',       lat:  52.3676, lon:    4.9041, elevation: -2 },
    { id: 'rdam',    name: 'Rotterdam Port',    country: 'Netherlands',category: 'infrastructure', lat:  51.9225, lon:    4.4792, elevation: -1 },
    { id: 'ven',     name: 'Venice',            country: 'Italy',      category: 'critical',       lat:  45.4408, lon:   12.3155, elevation:  1 },
    { id: 'lon',     name: 'Central London',    country: 'UK',         category: 'urban',          lat:  51.5074, lon:   -0.1278, elevation: 11 },
    { id: 'cph',     name: 'Copenhagen',        country: 'Denmark',    category: 'urban',          lat:  55.6761, lon:   12.5683, elevation:  4 },
    { id: 'stp',     name: 'St. Petersburg',    country: 'Russia',     category: 'urban',          lat:  59.9343, lon:   30.3351, elevation:  3 },
    { id: 'hmb',     name: 'Hamburg',           country: 'Germany',    category: 'infrastructure', lat:  53.5511, lon:    9.9937, elevation:  6 },
    { id: 'lis',     name: 'Lisbon',            country: 'Portugal',   category: 'urban',          lat:  38.7223, lon:   -9.1393, elevation:  8 },

    // --- Africa ---
    { id: 'ale',     name: 'Alexandria',        country: 'Egypt',      category: 'critical',       lat:  31.2001, lon:   29.9187, elevation:  5 },
    { id: 'lag',     name: 'Lagos',             country: 'Nigeria',    category: 'urban',          lat:   6.5244, lon:    3.3792, elevation:  3 },
    { id: 'dak',     name: 'Dakar',             country: 'Senegal',    category: 'urban',          lat:  14.7167, lon:  -17.4677, elevation: 20 },
    { id: 'cpt',     name: 'Cape Town',         country: 'S. Africa',  category: 'urban',          lat: -33.9249, lon:   18.4241, elevation: 25 },

    // --- Middle East ---
    { id: 'dxb',     name: 'Dubai',             country: 'UAE',        category: 'urban',          lat:  25.2048, lon:   55.2708, elevation:  5 },
    { id: 'doh',     name: 'Doha',              country: 'Qatar',      category: 'urban',          lat:  25.2854, lon:   51.5310, elevation:  3 },

    // --- Asia ---
    { id: 'bom',     name: 'Mumbai',            country: 'India',      category: 'urban',          lat:  19.0760, lon:   72.8777, elevation: 14 },
    { id: 'kol',     name: 'Kolkata',           country: 'India',      category: 'urban',          lat:  22.5726, lon:   88.3639, elevation:  9 },
    { id: 'dac',     name: 'Dhaka',             country: 'Bangladesh', category: 'critical',       lat:  23.8103, lon:   90.4125, elevation:  4 },
    { id: 'bkk',     name: 'Bangkok',           country: 'Thailand',   category: 'critical',       lat:  13.7563, lon:  100.5018, elevation:  1 },
    { id: 'sgn',     name: 'Ho Chi Minh City',  country: 'Vietnam',    category: 'urban',          lat:  10.7769, lon:  106.7009, elevation:  6 },
    { id: 'jkt',     name: 'Jakarta',           country: 'Indonesia',  category: 'critical',       lat:  -6.2088, lon:  106.8456, elevation:  8 },
    { id: 'sin',     name: 'Singapore',         country: 'Singapore',  category: 'urban',          lat:   1.3521, lon:  103.8198, elevation: 15 },
    { id: 'mnl',     name: 'Manila',            country: 'Philippines',category: 'urban',          lat:  14.5995, lon:  120.9842, elevation:  5 },
    { id: 'hkg',     name: 'Hong Kong',         country: 'China',      category: 'urban',          lat:  22.3193, lon:  114.1694, elevation: 10 },
    { id: 'sha',     name: 'Shanghai',          country: 'China',      category: 'urban',          lat:  31.2304, lon:  121.4737, elevation:  4 },
    { id: 'tok',     name: 'Tokyo Bay',         country: 'Japan',      category: 'urban',          lat:  35.6762, lon:  139.6503, elevation:  6 },
    { id: 'osa',     name: 'Osaka',             country: 'Japan',      category: 'urban',          lat:  34.6937, lon:  135.5023, elevation:  3 },

    // --- Oceania & low-lying islands ---
    { id: 'syd',     name: 'Sydney',            country: 'Australia',  category: 'urban',          lat: -33.8688, lon:  151.2093, elevation: 20 },
    { id: 'mle',     name: 'Malé',              country: 'Maldives',   category: 'critical',       lat:   4.1755, lon:   73.5093, elevation:  2 },
    { id: 'fun',     name: 'Funafuti',          country: 'Tuvalu',     category: 'critical',       lat:  -8.5211, lon:  179.1962, elevation:  2 },
    { id: 'tar',     name: 'Tarawa',            country: 'Kiribati',   category: 'critical',       lat:   1.4518, lon:  172.9717, elevation:  2 },

    // --- Natural landmarks ---
    { id: 'ever',    name: 'Everglades',        country: 'USA',        category: 'nature',         lat:  25.2866, lon:  -80.8987, elevation:  1 },
    { id: 'sund',    name: 'Sundarbans',        country: 'Bangladesh', category: 'nature',         lat:  21.9497, lon:   89.1833, elevation:  2 },
    { id: 'camg',    name: 'Camargue Wetlands', country: 'France',     category: 'nature',         lat:  43.5383, lon:    4.5689, elevation:  1 }
];
