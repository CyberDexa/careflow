import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation + project are picked up from env vars:
  // SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN
  silent: true,
  telemetry: false,
  // Only upload source maps in CI / production builds
  sourcemaps: { disable: process.env.NODE_ENV !== "production" },
});
