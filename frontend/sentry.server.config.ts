// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://03aac11f903162caf4cd87f3447dca86@o4511313609359360.ingest.us.sentry.io/4511313610473472",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

// Example metrics from the tutorial
Sentry.metrics.count("user_action", 1);
Sentry.metrics.distribution("api_response_time", 150);
Sentry.metrics.count("test_metric", 1);

