# Muninn MCP 🐦‍⬛
**Universal Context Protocol for AI Agents**

![Version](https://img.shields.io/badge/version-2.1.13-green)
[![npm version](https://img.shields.io/npm/v/muninn-core.svg)](https://www.npmjs.com/package/muninn-core)

**Muninn MCP** is a standardized memory layer for AI agents. It ensures that your AI assistants—whether they are running in the browser, the terminal, or your IDE—all share the same project-specific "Brain".

---

## 🚀 Why Muninn?

*   **Shared Context**: Cursor knows what you told Claude 10 minutes ago.
*   **95% Token Savings**: Don't waste tokens re-sending the same files. Muninn retrieves only the most relevant snippets.
*   **Local & Private**: All indices and memories are stored on your machine.
*   **Human Readable**: Memories are just Markdown files. Git-commit them if you want.

## 🛠 Quick Start

### 1. Install via npm
```bash
npm install -g muninn-core
```

### 2. Configure your Agent
Add the following to your MCP settings:

```json
"muninn": {
  "command": "npx",
  "args": ["-y", "muninn-core"]
}
```

## 🧠 Core Commands

*   `brain_check(task)`: Quickly load relevant project context for the current task.
*   `add_memory(title, content)`: Save a new learning, decision, or architectural pattern.
*   `search_context(query)`: Manually search the project's semantic index.
*   `reindex_context(path)`: Force a re-index of the project files.
*   `enforce_rules()`: (Optional) Inject Muninn protocols into project rule files.

---

## 🛡️ Security (Audit Ready)

Muninn MCP follows strict security guidelines to eliminate RCE and injection risks:
- **Sanitized Inputs**: All search queries are filtered via regex to prevent binary exploits.
- **No Shell Spawning**: Uses `execFile` exclusively to avoid command injection.
- **Opt-in Enforcement**: Automatic modification of `.cursorrules`/`CLAUDE.md` is disabled.
- **Transparent Middleware**: Automatic context enrichment (interceptors) is now opt-in and disabled by default.

---
*Built by BlackKnight. Distributed via npm.*
