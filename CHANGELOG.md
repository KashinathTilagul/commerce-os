# Changelog

All notable changes to Fashion OS are documented here. This format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

For a full release history, see [GitHub Releases](https://github.com/KashinathTilagul/Ekvaar/releases).

## [Unreleased]

- [3.3.1-release-stability] — 2026-08-09

  Production deployment stability release.

  - Fix production smoke test suite execution in deploy pipeline
  - Add health check polling with rollback guard on failure
  - Validate Docker Compose build, container startup, and `/api/health` readiness
  - Add `VERSION` file and update repository documentation

[3.3.1-release-stability]: https://github.com/KashinathTilagul/Ekvaar/releases/tag/v3.3.1-release-stability
