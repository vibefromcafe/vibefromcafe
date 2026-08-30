# Event publishing and public archive

## Public behavior

`/events` always loads the public event API. It does not substitute bundled seed data when the API fails, so loading failures remain visible and retryable. Only records whose status is exactly `published` can be returned publicly. Records with missing or historical invalid statuses fail closed as drafts.

Published events are split by their start time in WIB (`UTC+07:00`): upcoming events are oldest-first and past events are newest-first. Past events remain visible as an archive. When no upcoming event exists, the page says so without inventing an event or registration promise.

Every event card has the stable DOM target `id=<event.id>`. Existing links in the form `/events#event-id` therefore continue to scroll to that event whether it is upcoming or archived. Event IDs must remain stable after publication; the edit API intentionally does not rename IDs. `/event` continues to redirect to `/events`.

Optional action fields have one purpose each:

- `detailsUrl`: an external details page;
- `mapUrl`: the venue map;
- `registrationUrl`: registration for an upcoming event only.

All action URLs must use HTTP or HTTPS. The card always exposes its `/events#event-id` permalink. No action is rendered when its data is absent, and archived events do not retain a registration action.

## Admin behavior

New events begin as drafts. The form has separate **Save as draft** and **Publish event** actions; publishing is never inferred from a missing or unrecognized status. API clients that omit status also create a draft, while any supplied status other than `draft` or `published` receives `400`.

Deleting an event requires browser confirmation. Persistence keeps the existing `event-deleted:<id>` tombstone contract. Event writes store the verified admin identity in KV metadata as `updatedBy`; tombstones store it as `deletedBy`. That actor comes only from the verified admin middleware. Full immutable mutation history remains outside this event workflow.

## Launch decisions still requiring an owner

- Supply and approve real future event content and any details, map, or registration URLs. The repository does not invent these facts.
- Confirm that retaining published past events as a public archive is the desired long-term policy.
- Validate draft, publish, and confirmed delete against an authorized non-production KV binding before enabling production mutations.
