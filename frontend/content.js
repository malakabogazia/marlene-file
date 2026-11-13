/* All wording for the Marlene File. No numbers live here: every number on screen comes from the API. */
window.MF = window.MF || {};

// The three variables. `api` must equal Site.variable in the backend.
// `scale` turns the stored value into the displayed one (soil moisture 0.20 is shown as 20%).
MF.VARS = [
  { key: 'ppt', api: 'Precipitation', title: 'Precipitation', row: 'RAINFALL',
    hunch: 'The rain is shifting', scale: 1, unit: 'mm/year', slopeUnit: 'mm', modelled: false,
    plain: 'Precipitation is all the rain and snow that falls on a place in one year. 1 mm is 1 litre of water on every square metre.',
    dataset: 'GPCP Monthly V3.3 (satellites plus rain gauges)' },
  { key: 'aet', api: 'Actual evapotranspiration', title: 'Actual evapotranspiration', cardTitle: 'EVAPOTRANSPIRATION', row: 'EVAPORATION',
    hunch: 'The land is losing more water to the air', scale: 1, unit: 'mm/year', slopeUnit: 'mm', modelled: true,
    plain: 'Actual evapotranspiration is the water that really leaves the land and rises into the air: evaporation from soil and water, plus the water plants breathe out.',
    dataset: 'FLDAS Noah V001 (a land model, not a direct measurement)' },
  { key: 'soil', api: 'Soil moisture (0-10 cm)', title: 'Soil moisture', row: 'SOIL',
    hunch: 'The ground is getting wetter or drier', scale: 100, unit: '%', slopeUnit: 'points', modelled: true,
    plain: 'Soil moisture is how wet the top 10 cm of the ground is. It is an amount held in the soil, not a flow. 20% means a fifth of the soil is water.',
    dataset: 'FLDAS Noah V001 (a land model, not a direct measurement)' }
];

// The three regions. `api` must be the start of Site.name in the backend. Each has one colour and one icon everywhere.
MF.PLACES = [
  { key: 'med', api: 'Mediterranean', label: 'The Mediterranean', short: 'MED.', color: '#2a6fb8', icon: 'wave',
    box: { w: -10, e: 42, s: 29, n: 46 }, boxText: '10°W to 42°E, 29°N to 46°N',
    about: 'From Spain and Portugal in the west to Turkey and the Levant in the east, and from southern Europe down to the North African coast. Hot dry summers, mild wetter winters, hills, coasts and olive trees. The southern edge reaches into dry land.',
    background: 'Climate studies describe the Mediterranean as a region where warming raises the air’s demand for water, while its rain varies a great deal from year to year.' },
  { key: 'nile', api: 'Nile Delta', label: 'The Nile Delta', short: 'NILE', color: '#d9822b', icon: 'delta',
    box: { w: 29.5, e: 32.5, s: 30, n: 31.7 }, boxText: '29.5°E to 32.5°E, 30°N to 31.7°N',
    about: 'Northern Egypt, where the Nile spreads out before reaching the Mediterranean. Very little rain, but green farmland fed by the river and irrigation canals. The rain value rests on only 16 coarse map cells.',
    background: 'The Delta receives very little rain. Its farmland is fed by the Nile through irrigation canals, which rain-based records do not see.' },
  { key: 'sahel', api: 'Sahel', label: 'The Sahel', short: 'SAHEL', color: '#1e7a46', icon: 'sun',
    box: { w: -17, e: 20, s: 12, n: 18 }, boxText: '17°W to 20°E, 12°N to 18°N',
    about: 'A wide belt just south of the Sahara, from Senegal in the west toward Chad in the east. A dry land with a short rainy season and a long dry one, where a good or bad rainy season matters a great deal to farmers.',
    background: 'The Sahel had severe droughts in the 1970s and 1980s, and rainfall partly recovered afterwards. Our record starts in 1990, just after them.' }
];

// Marlene's thinking question for each case (variable, then place). It is answered by the proofs, not by a form.
MF.QUESTIONS = {
  ppt: { med: 'Many people say the Mediterranean is drying out. Do you think the rain readings agree?',
         nile: 'The Delta gets very little rain. Has even that little changed? Think before you look.',
         sahel: 'Is the Sahel getting wetter or drier? Think before you look.' },
  aet: { med: 'Hot summers pull water out of the land. Is the Mediterranean losing more of it to the air than before?',
         nile: 'These fields are green, yet our instrument sees only rain. How much water will it say rises here?',
         sahel: 'If more rain falls on the Sahel, does more water rise back into the air? What do you expect?' },
  soil: { med: 'After a long dry summer, how wet is the top of the ground? Has that changed in thirty years?',
          nile: 'Farmers water this soil from the river. Will a rain-only instrument notice? Make your guess.',
          sahel: 'A short rainy season, a long dry one. Is the Sahel’s topsoil holding more water, or less?' }
};

// Who this affects, one line per case.
MF.AFFECTS = {
  ppt: { med: 'Farmers, cities and reservoirs that rely on winter rain to last through the dry summer.',
         nile: 'Few people here: almost nobody farms the Delta on rain alone. It lives on the river.',
         sahel: 'Farmers and herders who depend on one short rainy season each year.' },
  aet: { med: 'Orchards, forests and crops that lose water to the air through long hot summers.',
         nile: 'Delta farmers, though their real water comes from irrigation the model cannot see.',
         sahel: 'Herders and farmers: where more water rises, plants are usually growing more.' },
  soil: { med: 'Rain-fed farms and wild plants whose roots drink from the topsoil.',
          nile: 'Delta farmers, whose soil is really kept wet by canals, not by rain.',
          sahel: 'Millet and sorghum farmers, whose seeds need a moist topsoil to sprout.' }
};

MF.NILE_WARNING = 'A detective checks what the instrument can see. This model knows rain only, not irrigation, so it describes a rain-only Delta and not the real green farmland.';
MF.MODEL_NOTE = 'Model output, not a direct measurement.';
MF.SOURCE_TBC = 'Source to be confirmed against a NASA page.';

// "One Water Cycle": background from published science, not proven by our tests.
MF.CYCLE = [
  { title: 'Rain falls on the land', text: 'Water comes down from the sky as rain or snow. That is precipitation, our first clue.' },
  { title: 'The soil keeps some of it', text: 'Part of the rain soaks into the ground and stays there for a while. That is soil moisture.' },
  { title: 'Plants and sun send water back', text: 'The sun dries the ground and plants breathe water out through their leaves. That is evapotranspiration.' },
  { title: 'Change one, and the others may follow', text: 'If the rain changes, the soil and the evaporation may change with it, because they are fed by the same water.' },
  { title: 'So results can be linked', text: 'This is why the three Sahel results are not three separate proofs: the same rainfall drives all three.' }
];

// Photo credits. Malak: replace each "to be completed" with the author and licence from the photo's source page.
MF.PHOTOS = {
  'med-aet': { alt: 'Dry summer plants in the Mediterranean', credit: 'Wikimedia Commons (author and licence to be completed)' },
  'med-soil': { alt: 'A tree on dry Mediterranean ground', credit: 'Wikimedia Commons (author and licence to be completed)' },
  'nile-ppt': { alt: 'Illustration of a rainstorm over Nile Delta farmland', credit: 'AI-generated illustration, not a photograph', ai: true },
  'nile-aet': { alt: 'Green crop fields in the Nile Delta seen from the air', credit: 'Wikimedia Commons (author and licence to be completed)' },
  'nile-soil': { alt: 'Satellite view of Egyptian farmland along the Nile', credit: 'Source to be completed' },
  'sahel-ppt': { alt: 'Satellite view of the Sahel turned green in the rainy season', credit: 'Source to be completed' },
  'sahel-aet': { alt: 'Thorn trees on dry Sahel ground in the dry season', credit: 'Wikimedia Commons (author and licence to be completed)' },
  'sahel-soil': { alt: 'Satellite view of dry Sahel soil and a river', credit: 'Source to be completed' }
};
