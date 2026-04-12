# ExecPlan: Run Chronicle + Lifetime Stats

## Summary
- Add a persistent run archive and lifetime stats system with local storage + optional cloud sync.
- Track completed runs (death, victory, give-up) with class, floor, cause, runes, badges, turns, and steps.
- Add a new Run Chronicle overlay with lifetime metrics and a scrollable run history list.
- Merge local/cloud archives by `runId` and keep saves listing isolated from non-save metadata docs.

## Acceptance Steps
1. `node --check game.js`
2. `rg -n "run-history-overlay|btn-runs-from-title|btn-runs-from-settings|glyphDepths_runArchive_v1" index.html game.js`
3. Manual validation:
   - Start a run, die, and verify a death entry appears in Run Chronicle.
   - Start a run, give up from Config, and verify a give-up entry appears.
   - Start a run and win (or force-victory in debug), and verify a victory entry appears.
   - Reload page and verify archive + lifetime stats persist.
   - Open/close Run Chronicle via both tap and click and verify `Escape` closes it.
   - Confirm Saved Games list does not show run-archive metadata docs when signed in.

## Progress
- Completed: run archive data model + persistence + sanitize/merge pipeline.
- Completed: run finalization hooks for death, victory, and give-up, with score write centralized in finalize path.
- Completed: Run Chronicle UI (title/settings entry points, overlay, lifetime stats, scrollable history list).
- Completed: cloud run archive document load/save + run-id merge + saves list filtering for non-save docs.
- Completed: roadmap refresh plus changelog/release summary updates.
- In progress: final verification and git workflow.

## Decision Log
- Use localStorage as always-on source with best-effort cloud merge for signed-in users.
- Use deterministic `runId` and idempotent finalization guard (`state._runFinalized`).
- Keep full archive storage up to 1000 records while rendering only newest 200 in UI.
- Treat "steps" as successful displacement on player movement actions.

## Surprises
- Existing run-end flow saved high scores from multiple UI paths, requiring centralization in one finalization path.
- Existing Firestore save listing accepted every document in `saves`, so non-save metadata filtering is required.
- Cloud history writes needed a load-merge-save chain during run finalization to avoid stale-device overwrite risk.
