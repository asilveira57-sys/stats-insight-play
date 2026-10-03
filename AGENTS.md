# Project architecture decisions

- Keep historical database identifiers and migration history unchanged during brand changes, because renaming persisted identifiers can break data and integrations.
- Use `https://www.aleball.com` as the sole public canonical origin, so generated pages and SEO signals remain consistent.
