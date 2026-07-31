# Privacy Operations

This document describes how operators handle personal data collected by the public forms.

## Collected Data

Community join submissions collect a person's name, city, role, WhatsApp number, referral source, optional referral detail, consent timestamp, and onboarding status.

Project inquiries collect a person's name, contact detail, message, consent timestamp, and inquiry status.

## Purpose

Community join submission data is used only for community onboarding, moderation, and related follow-up.

Project inquiry data is used only to respond to the submitted project inquiry.

## Access

Submitted personal data is visible only through admin routes protected by Cloudflare Access or the configured admin secret fallback. Public API responses must return only minimal record identifiers and status, and must not echo submitted personal fields.

## Retention

Active submissions and inquiries are retained while follow-up is active.

Closed, rejected, or otherwise inactive records should be reviewed for deletion after 90 days.

Duplicate markers are retained for 30 days. Rate-limit counters are short-lived operational records and should expire within minutes.

## Deletion Requests

When someone requests deletion, an operator should:

1. Confirm the request identifies the relevant submission or inquiry.
2. Locate matching records in Cloudflare KV by admin tooling or KV inspection.
3. Delete the operational record and any obvious duplicate marker.
4. Record that the deletion was completed without copying the person's submitted content into logs or tickets.

## Correction Requests

When someone requests correction, an operator should:

1. Confirm the request identifies the relevant submission or inquiry.
2. Update only the incorrect fields.
3. Preserve consent and original creation timestamps.
4. Avoid copying sensitive contact details into logs or unrelated tools.

## Export Handling

Exports are sensitive. Only authenticated operators should export submitted records, and exported files should be kept only as long as needed for the operational task. Do not share exports in public channels.

## Incident Handling

If submitted data, admin secrets, or Turnstile secrets are exposed:

1. Rotate affected secrets.
2. Review admin access.
3. Remove improperly exposed records or files.
4. Identify affected people and decide whether notification is needed.
5. Document the incident without including raw form contents or secret values.

## Logging

Do not log form contents, contact details, WhatsApp numbers, Turnstile tokens, admin secrets, or Turnstile secrets.
