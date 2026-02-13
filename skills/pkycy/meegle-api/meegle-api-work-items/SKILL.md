---
name: meegle-api-work-items
description: |
  Meegle OpenAPI for work items: create, get, update, and related operations. Prerequisites: token and domain — see skill meegle-api-users.
metadata:
  { "openclaw": {} }
---

# Meegle API — Work Items

Create and manage work items (tasks, stories, bugs, etc.) in a Meegle space.

**Prerequisites:** Obtain domain and access token first; see skill **meegle-api-users** for domain, plugin_access_token / user_access_token, and request headers.

---

## Create Work Item

Create a new work item in a Meegle space. Supports multiple work item types, templates, and custom fields. Requires permission: Work Items.

### When to Use

- When creating a new task, story, bug, or other work item
- When persisting structured work into Meegle
- When initializing workflows or planning items programmatically

### API Spec: create_work_item

```yaml
name: meegle.create_work_item
description: >
  Create a new work item in a specified Meegle space.
  Supports different work item types, templates, and custom fields.
  Requires permission: Work Items.

when_to_use:
  - When creating a new task, story, bug, or other work item
  - When an AI needs to persist structured work into Meegle
  - When initializing workflows or planning items programmatically

http:
  method: POST
  path: /open_api/{project_key}/work_item/create
  auth: plugin_access_token

path_parameters:
  project_key:
    type: string
    required: true
    description: Space ID (project_key) or space domain name (simple_name)

body_parameters:
  work_item_type_key:
    type: string
    required: false
    description: Work item type key (e.g. story, task, bug)

  template_id:
    type: integer
    required: false
    description: >
      Work item process template ID.
      If omitted, the default template of the work item type is used.

  name:
    type: string
    required: false
    description: Work item name

  required_mode:
    type: integer
    required: false
    default: 0
    enum:
      - 0  # do not validate required fields
      - 1  # validate required fields and fail if missing

  field_value_pairs:
    type: list[object]
    required: false
    description: >
      Field configuration list.
      Field definitions must match metadata from
      "Get Work Item Creation Metadata".
    item_schema:
      field_key:
        type: string
        required: true
      field_value:
        type: any
        required: true
      notes:
        - For option/select fields, value must be option ID
        - Cascading fields must follow configured option hierarchy
        - role_owners must follow role + owners structure

response:
  data:
    type: integer
    description: Created work item ID
  err_code:
    type: integer
  err_msg:
    type: string

error_handling:
  - code: 30014
    meaning: Work item type not found or invalid
  - code: 50006
    meaning: Role owners parsing failed or template invalid
  - code: 20083
    meaning: Duplicate fields in request
  - code: 20038
    meaning: Required fields not set

constraints:
  - name must not also appear in field_value_pairs
  - template_id must not appear in field_value_pairs
  - option-type fields must use option ID, not label
  - role_owners default behavior depends on process role configuration

examples:
  minimal:
    project_key: doc
    body:
      work_item_type_key: story
      name: "New Story"

  full:
    project_key: doc
    body:
      work_item_type_key: story
      template_id: 123123
      name: "Example Work Item"
      field_value_pairs:
        - field_key: description
          field_value: "Example description"
        - field_key: priority
          field_value:
            value: "xxxxxx"
        - field_key: role_owners
          field_value:
            - role: rd
              owners:
                - testuser
```

### Usage notes

- **project_key**: Path parameter, required. Use space ID (project_key) or space domain (simple_name).
- **name**: Work item name; do not also send name in field_value_pairs.
- **field_value_pairs**: Send other fields (description, priority, assignees, etc.) here; use option ID for option-type fields, not display labels.
- Before creating, call "Get Work Item Creation Metadata" to get field metadata for the type and template, then build field_value_pairs accordingly.

---

## Other work item APIs (to be documented)

Get work item, update work item, list work items, and related endpoints will be documented here.
