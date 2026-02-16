# 🧠 HEARTBEAT.md for Skill: NeverForget (Ultimate Memory)
**Version:** 1.0.1
**Description:** This HEARTBEAT.md acts as the system's "Self-Check" monitor to ensure the memory index and symlinks never break.

---
## 🧠 Local Memory Pulse (NeverForget)
| Component | Status | Check Command |
| :--- | :--- | :--- |
| **Local Memory** | {{local_memory_status}} | `openclaw memory status` |
| **Vector Index** | {{chunk_count}} Chunks | `openclaw memory status --deep` |
| **Memory Sync** | {{last_index_time}} | `openclaw memory status` |
| **Symlink Health** | {{links_active}} | `ls -L ~/.openclaw/workspace/dogecoin-core` |

### 🛠 Memory Recovery Logic
1. **If Index is 0:** Trigger `openclaw memory index` immediately.
2. **If Symlink is Broken:** Check path `/home/$USER/.dogecoin` and re-link if found.