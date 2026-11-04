# Calendar sync manual QA

Run these checks before merging calendar sync changes. Use a school SEQTA account with Google Calendar and/or Outlook connected in BetterSEQTA+ settings.

## Dual-tab overlap (duplicate prevention)

1. Open SEQTA in **Tab A** and wait for an automatic calendar sync to start (or trigger **Sync now** from settings).
2. Open the **same school** SEQTA origin in **Tab B** while Tab A is still syncing.
3. In Tab B, click **Sync now** for the same provider.
4. **Expected:** Tab B shows an error that sync is already running in another tab (no new duplicate events).
5. After Tab A finishes, sync from Tab B should succeed.

## Same-tab overlap

1. With one tab open, click **Sync now** twice quickly (or trigger sync while page-load sync is still running).
2. **Expected:** Only one sync runs; no duplicate calendar events for the same lessons.

## Google and Outlook together

1. Connect **both** Google and Outlook if available.
2. Start sync for Google, then immediately start sync for Outlook (same or different tabs).
3. **Expected:** Both providers can sync concurrently; neither blocks the other.

## Resume after interrupted sync

1. Start a full sync, then close the tab mid-sync (or kill the tab process).
2. Wait longer than the heartbeat stale window (~45s) without another tab syncing.
3. Reload SEQTA.
4. **Expected:** Sync resumes or can be started cleanly without duplicate events piling up.

## Duplicate cleanup (optional)

If duplicates already exist from an older build, run a full sync once and confirm extra remote events for the same lesson are removed from the calendar.
