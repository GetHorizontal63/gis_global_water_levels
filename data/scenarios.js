/*
 * Scenario Dataset — preset water-level situations for one-click exploration.
 * Levels are in meters above today's mean sea level.
 */
window.SCENARIOS = [
    { id: 'today',  label: 'Today (0 m)',                level: 0,
      note: 'Current mean sea level — the baseline.' },
    { id: 'king',   label: 'King Tide (+0.5 m)',         level: 0.5,
      note: 'Highest predicted astronomical tides of the year.' },
    { id: 'rcp45',  label: '2100 Moderate (+1 m)',       level: 1.0,
      note: 'IPCC intermediate emissions pathway, end of century.' },
    { id: 'rcp85',  label: '2100 High (+2 m)',           level: 2.0,
      note: 'High-emissions scenario with accelerated ice-sheet loss.' },
    { id: 'storm',  label: 'Storm Surge (+4 m)',         level: 4.0,
      note: 'Category-3-equivalent storm surge atop sea-level rise.' },
    { id: 'extreme',label: 'Worst Case (+8 m)',          level: 8.0,
      note: 'Multi-century ice-sheet collapse upper bound.' },
    { id: 'greenland',label: 'Greenland Melt (+7 m)',    level: 7.0,
      note: 'Full Greenland ice sheet collapse (thousands of years).' },
    { id: 'wais',   label: 'W. Antarctica (+58 m)',      level: 58.0,
      note: 'Complete West Antarctic Ice Sheet collapse.' },
    { id: 'allice', label: 'All Ice Gone (+70 m)',       level: 70.0,
      note: 'Every glacier and ice sheet on Earth melted.' }
];
