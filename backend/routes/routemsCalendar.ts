import { Router, Request, Response } from "express";
import { fetchMicrosoftCalendarEvents } from "../integrations/msCalendar";

const router = Router();

/**
 * GET /api/ms-calendar/events?year=2026&month=2
 *
 * Headers required:
 *   Authorization: Bearer <supabase-jwt>   (handled by global authMiddleware)
 *   X-Provider-Token: <microsoft-oauth-token>
 *
 * Returns Microsoft Calendar events for the requested month.
 */
router.get("/events", async (req: Request, res: Response) => {
  // --- Get Microsoft provider token ---
  const providerToken = req.headers["x-provider-token"] as string | undefined;
  if (!providerToken) {
    return res.status(400).json({
      error:
        "Missing X-Provider-Token header. Make sure the user logged in with Microsoft and pass session.provider_token.",
    });
  }

  // --- Determine month range ---
  const year = parseInt((req.query.year as string) ?? String(new Date().getFullYear()), 10);
  const month = parseInt((req.query.month as string) ?? String(new Date().getMonth() + 1), 10); // 1-based

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "Invalid year or month query params." });
  }

  // First moment of the month (UTC)
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  // First moment of the NEXT month minus 1ms = last ms of this month
  const endDate = new Date(Date.UTC(year, month, 1) - 1).toISOString();

  try {
    const events = await fetchMicrosoftCalendarEvents(providerToken, startDate, endDate);
    return res.json({ events });
  } catch (err: any) {
    console.error("[ms-calendar] Graph API error:", err?.message);

    // Detect expired / invalid token
    if (err?.message?.includes("401") || err?.message?.includes("InvalidAuthenticationToken")) {
      return res.status(401).json({
        error: "Microsoft token is invalid or expired. Please sign out and sign in again.",
      });
    }

    return res.status(500).json({ error: "Failed to fetch Microsoft Calendar events." });
  }
});

export default router;