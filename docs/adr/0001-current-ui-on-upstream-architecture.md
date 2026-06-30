# ADR 0001: Current UI on Upstream Architecture

## Status
Accepted

## Context
The current repository contains the desired Vibe Coding From Cafe visual direction and homepage narrative. The upstream `zainfathoni/vibefromcafe` repository contains the desired deployment and runtime architecture.

## Decision
Use the current repository UI as authoritative, while migrating the app architecture to React Router framework mode, Cloudflare Pages, Pages Functions, and KV-backed runtime data.

## Consequences
- The revamp preserves the current visual identity.
- The route/runtime contract follows the upstream architecture.
- Future UI work should not blindly copy upstream screens when they conflict with the VCFC design direction.
