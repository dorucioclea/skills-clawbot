---
name: meegle-api
description: |
  Meegle Open API skills (index). Read the specific skill for your need. Order: Users, Space, Work Items, Setting, Comments, Views & Measurement.
metadata:
  { "openclaw": {} }
---

# Meegle API (index)

Meegle OpenAPI is split into the following skills. Read **meegle-api-users** first for domain and token; then read the skill that matches your task.

| Order | Sub-skill (path under meegle-api/) | When to read |
|-------|-------------------------------------|--------------|
| 1 | **meegle-api-users/SKILL.md** | Domain, access token, context (project_key, user_key), request headers, global constraints. Read this before any other Meegle API call. |
| 2 | **meegle-api-space/SKILL.md** | Space (project) operations. |
| 3 | **meegle-api-work-items/SKILL.md** | Create, get, update work items (tasks, stories, bugs). |
| 4 | **meegle-api-setting/SKILL.md** | Settings, work item types, fields, process configuration. |
| 5 | **meegle-api-comments/SKILL.md** | Comments on work items or other entities. |
| 6 | **meegle-api-views-measurement/SKILL.md** | Views, kanban, Gantt, charts, measurement. |

Each sub-skill lives under `skills/meegle-api/` (e.g. `skills/meegle-api/meegle-api-users/SKILL.md`). Use the `Read` tool on the relevant path when you need that API area.
