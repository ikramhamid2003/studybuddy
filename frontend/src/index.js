import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Analytics } from "@vercel/analytics/react";
import * as Sentry from "@sentry/react";

// Error monitoring is optional; local development runs cleanly without a DSN.
if (process.env.REACT_APP_GLITCHTIP_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_GLITCHTIP_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Ignore browser-extension content script noise, not app failures.
    ignoreErrors: [
      /A runtime\.onMessage listener/i,
      /Extension context invalidated/i,
      /chrome-extension:/i,
    ],
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // StrictMode helps catch unsafe React patterns during local development.
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
