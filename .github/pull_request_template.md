## 🔗 Linked Issue

- Linear: [LIN-XXX](https://linear.app/your-org/issue/LIN-XXX)

> Replace `LIN-XXX` with the actual Linear issue ID.  
> Every PR should be associated with at least one Linear issue.

---

## 📘 Summary (Explain Like I’m a PM)

**What is this PR doing, in plain English?**

- Short, non-technical description of the change.
- Mention the user or system behavior that changed.

Example:

> This adds a filter bar to the Dataset Explorer so users can filter by dataset type and storage provider.

---

## ✅ Acceptance Criteria Checklist

Copy the acceptance criteria from Linear and mark them off:

- [ ] AC1: …
- [ ] AC2: …
- [ ] AC3: …

> If any criteria are not implemented, clearly explain why in the Notes section below.

---

## 🧱 Implementation Details (Engineer-Facing)

**High-level architecture & decisions:**

- Data model changes (e.g., Supabase schema / types)
- API changes (routes, handlers, validations)
- Frontend changes (components, pages, hooks)
- Important patterns or abstractions introduced

You can use bullets:

- **Data / schema:**
- **API / logic:**
- **UI / components:**
- **Other:**

---

## 🧪 Testing

Describe how this was tested:

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

**Details:**

- Test commands run (e.g. `pnpm test`, `npm run lint`)
- Any new test files or suites added
- Manual test scenarios verified

Example:

- `pnpm test dataset-explorer`
- Verified filter bar updates results without page reload.

---

## ⚠ Assumptions & Decisions

List any assumptions you made or ambiguous areas you had to resolve:

- Assumption 1: …
- Assumption 2: …

If there were product ambiguities:

> “The PRD did not specify X, so I implemented Y as the safest minimal behavior.”

---

## 🚫 Out of Scope / Follow-ups

Anything intentionally **not** done here, with reason:

- Deferred items
- Known issues
- TODOs that require a separate ticket

Example:

- Pagination for the filter results is **not implemented**; will be addressed in `LIN-212`.

---

## 📸 Screenshots (if UI-related)

> Before / After, or key states.

- Before:
- After:

(Attach images here if available.)

---

## 🔍 Checklist (Sanity)

- [ ] PR title includes the Linear issue ID (e.g., `LIN-204: Add dataset filter bar`)
- [ ] Changes follow existing architecture and conventions
- [ ] No debug logs or leftover temporary code
- [ ] Docs updated if needed
