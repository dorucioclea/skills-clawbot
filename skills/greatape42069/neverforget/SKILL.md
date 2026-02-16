---
name: neverforget
version: 1.0.2
description: Automates Sovereign Local Vector Memory, Symlinks, and Gemma-300M Embeddings. The Ultimate Sovereign Memory for Degen Doge. Use this skill to manage local vector embeddings, sync external Dogecoin infrastructure symlinks, and monitor memory health.
---

# 🧠 Skill: neverforget (Ultimate Memory)

## 🛡️ Security & Privacy Disclosure
This skill bridges your local Dogecoin node data into the OpenClaw workspace via symbolic links. 
- **Privacy:** Data is indexed locally using Gemma-300M. No data leaves your machine.
- **Risk:** Indexing `~/.dogecoin` allows the agent to read node configurations. Ensure your `wallet.dat` is password protected.

## Core Workflows
1. **Infrastructure Sync**: Bridges `~/.dogecoin` and `~/.doginals-main` into the workspace.
2. **Local RAG**: Uses Gemma-300M for offline project knowledge.
3. **Pulse Check**: Monitoring via [HEARTBEAT.md](references/HEARTBEAT.md).

## Procedures
- To refresh the brain, run `openclaw memory index`.
- To check symlink health, see the heartbeat reference in the `references/` folder.

## 🛠 Dependencies
- **Engine:** `node-llama-cpp`
- **Plugin:** `memory-core`
- **Model:** `Gemma-300M-QAT`

## 🚀 Auto-Install Script
```bash
# Phase 1: Engine & Plugin Activation
pnpm add node-llama-cpp -w
openclaw plugin enable memory-core

# Phase 2: System Configuration
openclaw config set agents.defaults.memorySearch.provider local
openclaw config set agents.defaults.memorySearch.local.modelPath "hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf"

# Phase 3: Infrastructure Bridging (Symlinks)
ln -s /home/$USER/.dogecoin ~/.openclaw/workspace/dogecoin-core
ln -s /home/$USER/.doginals-main ~/.openclaw/workspace/doginals-main
ln -s /home/$USER/.crabwalk ~/.openclaw/workspace/crabwalk

# Phase 4: Master Heartbeat Injection (Append Mode)
# Matches the official "references" structure
cat ~/.openclaw/skills/neverforget/HEARTBEAT.md >> ~/.openclaw/workspace/HEARTBEAT.md

# Phase 5: Final Activation
openclaw gateway restart
openclaw memory index