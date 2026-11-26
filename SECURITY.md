# Security Policy

## Supported Versions

Only the latest minor release receives security fixes. Older tags are archived, not maintained.

| Version | Supported |
|---|---|
| latest minor | yes |
| everything older | no |

## Reporting a Vulnerability

Use **[GitHub Security Advisories](https://github.com/studio-prisma/homeassistant-cards-liquid-glass/security/advisories/new)**. They are private by default. Do not open a public issue for a suspected vulnerability.

Include:

- the version of the cards and of Home Assistant
- what an attacker gains, not only what misbehaves
- reproduction steps, ideally with a minimal card configuration

Expected response: an acknowledgement within 7 days, an assessment within 30. This is a spare-time project without an on-call rotation.

## What the cards do

The file runs in the browser inside the Home Assistant frontend, with the rights of the logged-in user. It reads entity states, areas and devices from the frontend, calls services the dashboard author configured, and reads history for one entity over the existing websocket. It opens no connection of its own, loads nothing from other hosts and stores nothing in the browser. `tools/lint.mjs` fails the build if such an API appears in the sources.

## In Scope

- An entity name, state, attribute or area name that ends up interpreted as markup or script. All such text must be rendered as text.
- A card configuration that makes the cards navigate to another origin or load a resource from another host.
- A way for a user without edit rights on the dashboard to make a card call a service the dashboard author did not configure.
- A regular expression in `lg-list` that the cards themselves supply and that can freeze the page on ordinary input.
- Anything shipped in a release that is not built from `src/` of the tagged commit.

## Out of Scope

- Services a dashboard author configured on purpose. A `button` with `service` runs that service for whoever can see the dashboard. That is the same trust model as `tap_action` in every Home Assistant card.
- A `pattern` in `lg-list` written by the dashboard author that is slow on their own data.
- Issues in Home Assistant, its frontend or other cards. Report those upstream.
- Anything that requires an already compromised Home Assistant instance, browser or admin account.
- Automated scanner output without a working proof of concept.

## Handling of Secrets

No credentials belong in this repository: not in tests, not commented out, not in fixtures. A secret that reached a commit is rotated first and removed second.

## Disclosure

Coordinated. A fix ships first, the advisory follows once a patched release is available. Reporters are credited unless they ask not to be.
