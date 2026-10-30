# AI Workforce Live Acceptance

Production tested on 2026-08-10 at `https://commerce.abata.tech` with a signed-in founder session.

## Passed

- Exact reply: one CEO task completed and rendered exactly `EXACT_OK`.
- Planner routing: finance to CFO, email to Content, image to Image, video to Video, PDF to Executive Summary, and image plus PDF to two parallel tasks.
- Agent controls: pause/resume, heartbeat, instant pulse, instructions save, skill toggle/restore, configuration save, and budget limit save.
- Navigation and filters: agent filters/search, org chart pulse, goal form create/cancel, approval filters, work-log navigation, activity, costs, and settings.
- Governance settings saved and restored without changing the configured policy.
- Shopify read-only verification returned `Connection verified`.
- Video generation created a persisted artifact and direct artifact link.

## Failed And Required Fixes

All items below are implemented on the acceptance-fix branch and remain open until the post-deployment live retest passes.

1. Run trace: selecting a run never opens detail because the route includes a nonexistent Prisma `wakeRequests` relation.
2. Issues: issue cards do not open; `selectedIssue` is never rendered. The detail workflow needs status, assignee, comments, run action, and history.
3. Issue assignment: the UI PATCHes `assigneeId`, but the route ignores it. The control appears to save, then reverts, and Run never appears.
4. Goals: create works, but existing goals have no progress, pause/resume, or delete controls despite backend support.
5. Request lifecycle: no Archive control exists. Historical malformed requests remain in Overview and their terminal work pollutes active Projects.
6. Cross-type media: finance, email, and PDF tasks attempted unsolicited image generation and blocked on that failure. Media execution must be gated by the planned item type.
7. Image generation: the live provider returns `User not found`; a working provider path or fallback is required.
8. Video rendering: MP4 output is placed in an iframe, which displays `refused to connect`; it must use a native video player.
9. Audio: audio requests route to the CEO as plain text, print a `GENERATE_AUDIO` marker, and falsely complete without an audio artifact.
10. PDF: PDF tasks are hidden by the unsolicited image failure. After media gating, the PDF artifact and inline viewer must be verified live.

## Intentionally Not Mutated

- Monthly spend reset was not clicked because it destroys real cost history.
- Approval resolution buttons could not be exercised because there was no pending approval.
- Meta Ads and Instagram remain correctly blocked while disconnected.
