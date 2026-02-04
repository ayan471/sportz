import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJECT_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) throw new Error("ARCJET_KEY environment variable is missing.");

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
      ],
    })
  : null;

/**
 * Create an Express-compatible middleware that applies Arcjet protection to incoming requests.
 *
 * The returned middleware calls `next()` immediately when Arcjet is not configured.
 * When Arcjet is configured, the middleware evaluates the request with Arcjet:
 * - If Arcjet denies the request due to rate limiting, responds with HTTP 429 and `{ error: "Too many requests." }`.
 * - If Arcjet denies the request for any other reason, responds with HTTP 403 and `{ error: "Forbidden." }`.
 * - If an error occurs while invoking Arcjet protection, logs the error and responds with HTTP 503 and `{ error: "Service Unavailable" }`.
 * On successful protection, the middleware calls `next()` to continue request processing.
 *
 * @returns {function} An Express middleware function `(req, res, next) => void`.
 */
export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) return next();

    try {
      const decision = await httpArcjet.protect(req);

      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too many requests." });
        }

        return res.status(403).json({ error: "Forbidden." });
      }
    } catch (e) {
      console.error("Arcjet middleware error", e);
      return res.status(503).json({ error: "Service Unavailable" });
    }

    next();
  };
}