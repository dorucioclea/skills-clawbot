# codexmonitor

List, inspect, and watch local OpenAI Codex sessions (CLI + VS Code) using the CodexMonitor Homebrew formula.

Reads session logs from `~/.codex/sessions/`. Requires the `cocoanetics/tap` Homebrew tap.

## ClawHub

Published on [ClawHub](https://clawhub.com/skills/codexmonitor).

See [SKILL.md](SKILL.md) for full documentation.

## Install

```bash
brew tap cocoanetics/tap
brew install codexmonitor
```

## Usage

```bash
codexmonitor list 2026/01/08          # List sessions for a day
codexmonitor show <session-id>        # Show a session
codexmonitor watch                    # Watch all sessions live
```

## License

MIT
