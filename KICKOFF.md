# Kickoff — Session Startup Script

Run through this checklist at the start of every working session.

---

## 1. Check Current State

```bash
# Verify clean working tree
git status

# Pull latest changes
git pull origin main
```

If there are uncommitted changes:
- **Stash them** with `git stash push -m "WIP: description"` if you want to save them temporarily
- **Or ask the user** if they should be committed first

---

## 2. Inspect Progress

1. Read `doc/progress/SUMMARY.md` to see what's completed and in-progress.
2. Read `doc/spec/ROADMAP.md` to identify the next unstarted card.
3. Determine which card to work on based on dependencies.

---

## 3. Assess & Plan

Before writing code, evaluate:

| Factor | Questions |
|--------|-----------|
| **Complexity** | Is this a simple implementation or a complex feature? |
| **Risk** | Does it touch the database schema or core APIs? |
| **Testing** | Will new tests be required? |
| **Scope** | Can this be done in one session, or should it be split? |

---

## 4. Branching Decision

Prompt the user with your assessment:

> *"The next card is [Card XX: Title]. It's [simple/complex] — involves [scope summary]. Should I create a feature branch (`feature/XX-description`) to trigger the preview workflow, or work directly on main?"*

### Branching Guidelines

- **Create a branch** if:
  - The work involves multiple files or significant changes
  - You want the full CI/CD pipeline to run
  - It's a feature that should be reviewed via PR

- **Work on main** if:
  - Quick fixes or single-file changes
  - Documentation-only updates
  - The user explicitly approves

---

## 5. Launch Work

1. Read the relevant specification in `doc/ref/` to refresh context.
2. Begin implementation.
3. Follow the acceptance criteria in the spec.

---

## 6. Verification (End of Session)

1. **Run lint/typecheck**:
   ```bash
   # Python
   ruff check .
   mypy .

   # TypeScript/Frontend
   npm run lint
   npm run typecheck
   ```

2. **Run tests**:
   ```bash
   make test-unit    # or relevant test command
   ```

3. **Verify acceptance criteria** from the card spec.

---

## 7. Close & Update Progress

1. Commit all changes with a descriptive message.
2. Update `doc/progress/SUMMARY.md`:
   - Move the card from "In Progress" or "Next Up" to "Completed"
   - Add any notes about blockers or follow-ups
3. Push to the appropriate branch (or main).

---

## Example Flow

```
> git status
On branch main. Working tree clean.

> cat doc/progress/SUMMARY.md
## Completed
- [x] Card 01: Scraper Base Class
## Next Up
- Card 02: WebSocket Protocol

> "Card 02 involves implementing the WebSocket connection manager, message types, and client-side reconnection hook. It's medium complexity. Should I create a feature branch (`feature/02-websockets`) or work on main?"
```