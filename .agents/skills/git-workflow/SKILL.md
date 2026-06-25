---
name: git-workflow
description: Use whenever doing git or GitHub work in the employee-leave-calendar repo — starting a piece of work, creating a branch, writing commits, opening or merging a pull request, or cleaning up history. Covers the team's GitHub Flow (short-lived feature branches off main), atomic Conventional Commits, the <type>/<kebab-summary> branch naming, and squash-and-merge for PRs via the gh CLI. Trigger it even when the user just says "commit this", "start on X", "open a PR", "merge it", or "branch off" — the conventions here apply to all of those, not only when someone explicitly asks about "the git workflow".
---

# Git workflow (GitHub Flow + atomic commits + squash merge)

This repo follows **GitHub Flow**: `main` is always releasable, and all work happens on
short-lived branches that merge back via pull request. The goal is a `main` history that
reads as a clean, linear list of self-contained changes — one squashed commit per PR —
while still letting work-in-progress branches be messy.

Three habits make that work: branch off `main` for every change, write **atomic** commits
with **Conventional Commit** messages, and **squash-and-merge** every PR. The sections
below explain each, and why it matters.

GitHub operations use the **`gh` CLI** (the GitHub MCP server is unreliable here). Assume
`gh` is authenticated; if a command fails on auth, surface it rather than guessing.

## 1. Start every change on a branch off main

Never commit directly to `main`. Before the first change of any task, branch from an
up-to-date `main`:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b <type>/<kebab-summary>
```

Branching first (not after you've already edited files) keeps `main` clean and means
there's always a PR to attach review and discussion to. If you catch yourself with
uncommitted work on `main`, create the branch now — `git checkout -b <branch>` carries
the working changes over.

## 2. Branch naming: `<type>/<kebab-summary>`

The prefix is the same set of types as Conventional Commits, so the branch announces the
kind of change at a glance and lines up with the commits it will carry.

**Examples:**
- `feat/month-view`
- `fix/leave-overlap-validation`
- `chore/project-structure`
- `docs/architecture-readme`

Keep the summary short, lowercase, and hyphenated — it's a label, not a sentence. One
coherent change per branch; if you're tempted to put two unrelated things on one branch,
split them so each gets its own PR and its own squashed commit on `main`.

## 3. Atomic commits

An **atomic commit** is one complete, self-contained change: it does exactly one logical
thing, and the repo still builds/tests green at that commit. "One thing" is about
intent, not line count — a rename touching 30 files is atomic; bundling a bug fix with an
unrelated refactor is not.

Why it's worth the discipline: atomic commits make `git revert`, `git bisect`, and review
tractable, and they keep each squash-merged PR focused. On a feature branch your local
history can be as messy as you like (squash-merge collapses it anyway), but aim for
atomic commits whenever they're cheap — they make the branch reviewable before the squash.

Practical cues:
- Don't mix refactor + behavior change in one commit. Refactor first, then change behavior.
- Don't sweep unrelated files in with `git add -A` / `git add .`. Stage deliberately so
  the commit matches its message.
- If a commit message needs the word "and", it's probably two commits.

## 4. Commit messages: Conventional Commits

Format: `<type>(<optional-scope>): <imperative summary>`. Subject in the imperative mood
("add", not "added"/"adds"), no trailing period, ~72 chars or fewer. Add a body (after a
blank line) when the *why* isn't obvious from the subject.

**Types:** `feat` (user-facing capability), `fix` (bug fix), `chore` (tooling/config/scaffold,
no app-behavior change), `docs`, `refactor` (no behavior change), `test`, `perf`, `build`,
`ci`. Scope is the area touched (`auth`, `calendar`, `leave`, `readme`, …) and is optional.

**Examples:**

Input: Added the calendar month-view navigation arrows
Output: `feat(calendar): add month view navigation`

Input: Stop letting people book leave that overlaps an existing entry on the same day
Output: `fix(leave): reject overlapping leave on the same day`

Input: Set up the empty monorepo folder tree, no build files yet
Output:
```
chore: scaffold monorepo project structure

Folders carry README and .gitkeep placeholders only; no build files yet.
```

The type you pick should match the branch prefix — a `fix/...` branch whose only commit is
a `feat:` is a sign the branch is mislabeled or doing too much.

## 5. Pull requests

Push the branch and open a PR against `main` with `gh`:

```bash
git push -u origin <branch>
gh pr create --base main --title "<type>(<scope>): <summary>" --body "<body>"
```

Title the PR like a Conventional Commit — it becomes the squashed commit subject on `main`
(see §6). In the body, lead with **why** the change exists and a short **what** summary;
link issues with `Closes #<n>` when relevant. Keep PRs small and single-purpose so review
stays fast and the squashed commit stays focused.

When several PRs are open at once, check for overlap before merging — two PRs touching the
same files conflict for whoever merges second even if GitHub shows both "mergeable" (it
evaluates each against the current `main`, not against each other).

## 6. Merge with squash-and-merge

Always **squash-and-merge**. This collapses the branch's commits into one tidy commit on
`main`, so `main`'s history is one self-contained commit per PR regardless of how noisy the
branch was — easy to read, revert, and bisect.

```bash
gh pr merge <number> --squash --delete-branch
```

Before merging, confirm the PR is `MERGEABLE` / `CLEAN`:

```bash
gh pr view <number> --json mergeable,mergeStateStatus --jq '{mergeable,state:.mergeStateStatus}'
```

Because the branch is squashed into one commit, **make the squash commit message a clean
Conventional Commit** — edit the generated message if it concatenated every WIP commit.
Then delete the merged branch (`--delete-branch`, or in the UI) to keep the branch list
short. Do **not** use a plain merge commit or rebase-merge here; squash is the team default.

## 7. Keeping a branch current

If `main` has moved on and the PR needs updating, rebase onto the latest `main` to keep a
linear branch history, then force-push safely:

```bash
git fetch origin
git rebase origin/main          # resolve conflicts, then: git rebase --continue
git push --force-with-lease
```

Use `--force-with-lease` (never a bare `--force`) so you don't clobber commits someone else
pushed to the branch. Rebase is for branches that aren't yet merged; never rebase `main`
itself.

## Quick checklist

- [ ] Branched off an up-to-date `main` as `<type>/<kebab-summary>` before editing
- [ ] Commits are atomic and messages follow Conventional Commits
- [ ] PR opened against `main` with a Conventional-Commit-style title and a why-first body
- [ ] PR is `MERGEABLE`/`CLEAN`; checked for overlap with other open PRs
- [ ] Merged with `--squash --delete-branch` and a clean squash commit message
