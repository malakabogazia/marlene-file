/* Settings for the Marlene File frontend. This is the only file to edit when deploying somewhere else.
   The frontend has no build step, so this file plays the role of an environment variable. */
window.MARLENE_CONFIG = {
  // Address of the backend, without a trailing slash. '' means "the same site that serves this page".
  // Example for a separate frontend host: 'https://marlene-file.onrender.com'
  API_URL: '',

  // Nile Delta evapotranspiration and soil moisture come from a model that ignores irrigation.
  // true  = keep both cases, with Marlene's warning.   false = hide both cases (7 cases instead of 9).
  SHOW_NILE_MODEL_CASES: true
};
