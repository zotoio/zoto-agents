# Changelog

All notable changes to this plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-16

### Added

- Initial release of `zoto-cursor-top`.
- `cursor-top` CLI binary - live updating htop-style TUI of every Cursor agent
  on the machine.
- Process discovery for Cursor IDE, the `cursor-agent` CLI, and Cursor Cloud
  Agent VMs (Linux / macOS / Windows).
- Session metadata reader: start time, model, repository, status.
- Parent-to-subagent hierarchy via session metadata, with `ppid` fallback.
- Per-row scrolling tail of the last 3 log lines for every agent.
- Expand / collapse, follow mode, refresh interval controls, and keyboard
  navigation.
- `--demo` mode for offline previews and screenshotting.
- `--json` and `--once` modes for scripting and CI integration.
- `/zoto-cursor-top` slash command, `zoto-cursor-top-monitor` skill, and
  `zoto-cursor-top-troubleshooter` agent for in-Cursor invocation and
  troubleshooting.
