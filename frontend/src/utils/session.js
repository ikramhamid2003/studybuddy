// Where the API lives and how the browser authenticates to it.
//
// Two modes, chosen by the API base URL:
//
//  * Cookie mode (REACT_APP_API_URL is a relative path such as "/api"): the
//    API is reached through the site's own domain, so the login tokens live in
//    httpOnly cookies the page's JavaScript cannot read. The client only keeps
//    a non-secret copy of the user's identity for the UI.
//  * Token mode (an absolute URL, the default): the API is on another domain,
//    where browsers refuse third-party cookies, so tokens are kept in
//    localStorage as before.

const DEFAULT_API_URL = import.meta.env.PROD
  ? "https://studybuddy-api-hkgx.onrender.com/api"
  : "http://localhost:8000/api";

export const API_BASE_URL = import.meta.env.REACT_APP_API_URL || DEFAULT_API_URL;

export const COOKIE_MODE = API_BASE_URL.startsWith("/");

// Asks the API for cookie sessions, and doubles as the CSRF defence: a
// cross-site page cannot attach a custom header.
export const CLIENT_HEADERS = COOKIE_MODE ? { "X-StudyBuddy-Client": "web" } : {};

export const cookieInit = COOKIE_MODE ? { credentials: "include" } : {};

// Cookie mode only: who is signed in. Not a credential.
export const IDENTITY_KEY = "studybuddy_identity";

export function readIdentity() {
  try {
    const raw = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? "null");
    return raw && typeof raw.id === "number" ? raw : null;
  } catch {
    return null;
  }
}

export function writeIdentity(user) {
  if (user) localStorage.setItem(IDENTITY_KEY, JSON.stringify({ id: user.id, username: user.username }));
  else localStorage.removeItem(IDENTITY_KEY);
}

// Sessions from before cookie mode left tokens in localStorage. They are no
// longer used there, so remove them instead of leaving readable credentials.
export function discardLegacyTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh");
}
