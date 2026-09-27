// Study 7 site configuration: the four values that differ between environments live here and nowhere else
// (handoff v14, Architecture > Site config). The data notice page includes this file too.
// FUNCTION_URL: the deployed study7 function's HTTPS URL (empty until go-live step 4). Its origin must also be in netlify.toml's connect-src.
// TURNSTILE_SITE_KEY: the Cloudflare Turnstile site key (public). The secret key never appears in any repo.
// OSF_PREREG_URL: the public OSF pre-registration address; empty until the registration exists (the data notice hides the link).
// PRODUCTION_ORIGIN: submissions from this origin carry stage-a-v1-<language>; from any other origin they carry stage-a-test.
window.STUDY7_CONFIG = {
  FUNCTION_URL: 'https://europe-north1-maximized-impact-research.cloudfunctions.net/study7',
  TURNSTILE_SITE_KEY: '2x00000000000000000000BB',
  OSF_PREREG_URL: '',
  PRODUCTION_ORIGIN: 'https://research.maximized-impact.org',
};
