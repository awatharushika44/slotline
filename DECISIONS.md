\# Slotline — Technical Decisions



\## Phase 0 additions: Edge cases



| Decision                            | Chosen                                                                      | Rejected                      | Why                                                                                                 |

| ----------------------------------- | --------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |

| Editing a reservation (BR11)        | Same overlap rule, excluding itself                                         | Skip check on edit            | Edits must never create overlaps; self-overlap must not block the edit                              |

| Ended / in-progress bookings (BR12) | Ended = read-only; in progress = start locked, end editable, cancel allowed | Allow all edits anytime       | History must stay trustworthy. Trade-off: cancel of in-progress booking hides real usage from stats |

| Midnight crossing (BR13)            | One range of instants, clipped per day in the UI                            | Date + two times model        | Ranges map directly to `tstzrange` and make overlap math simple                                     |

| Cancel/rebook race (BR14)           | Rely on DB constraint, no app locks                                         | Row locks / check-then-insert | Check-then-insert has a race window; the constraint is atomic. Cancel is idempotent                 |

| Deactivated users (BR15)            | Deactivate, keep future bookings, flag for admin                            | Hard delete or auto-cancel    | Same principle as resources: never destroy history silently                                         |



\## Phase 1: Setup and tooling



| Decision         | Chosen                                                                          | Rejected                       | Why                                                                                                    |

| ---------------- | ------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |

| ORM              | Drizzle                                                                         | Prisma                         | SQL stays visible; clean raw-SQL migrations for the exclusion constraint. Trade-off: smaller ecosystem |

| Database runtime | Docker Compose, `postgres:16-alpine`                                            | Local install, `latest` tag    | Same setup for every developer; pinned major version                                                   |

| Styling          | Tailwind CSS                                                                    | Plain CSS                      | Fast, consistent design tokens                                                                         |

| Folder structure | `app` / `components` / `lib` {`validation`, `domain`, `services`, `db`, `time`} | Logic inside routes/components | Testable pure domain logic; clear dependency direction                                                 |

| Git workflow     | Short branches, PRs to `main`, squash merge, Conventional Commits               | Direct pushes to `main`        | Clean, reviewable history                                                                              |

| CI               | GitHub Actions: lint + typecheck now, tests in Phase 4                          | No CI                          | Automatic proof of quality on every push                                                               |

| Secrets          | `.env` ignored, `.env.example` committed                                        | Committing real values         | Never commit secrets                                                                                   |



