# Git Workflow Rules

- Read `.agents/skills/git-workflow/SKILL.md` before any git or GitHub action (branching, committing, opening or merging a PR)
- Never commit directly to `main` — branch first as `<type>/<kebab-summary>` off an up-to-date `main`
- Write atomic commits with Conventional Commit messages (`<type>(scope): imperative summary`)
- Open PRs against `main`; squash-and-merge them (`gh pr merge <n> --squash --delete-branch`) with a clean Conventional Commit squash message
- Use the `gh` CLI for GitHub operations; force-push only with `--force-with-lease`
