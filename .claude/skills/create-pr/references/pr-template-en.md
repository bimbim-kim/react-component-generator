# PR Template (English)

Use for international / open-source projects. Write everything in English. Keep code identifiers, file paths, and commands verbatim.

## Title rules

Use Conventional Commits style: `type: short summary` (feat, fix, refactor, docs, test, chore). Imperative mood, lowercase after the colon, no trailing period, 72 characters or fewer. If the project's recent PR titles use a different convention (e.g. `type(scope):`), follow that instead.

Example: `feat: validate prompt length and show counter in PromptInput`

## Body

```markdown
## Summary

<!-- What does this PR do? 1-3 sentences. Link the issue below if there is one. -->

Closes #

## Changes

<!-- Key changes reviewers need to know, as bullets. Focus on behavior, not a file listing. -->

-

## Motivation

<!-- Why is this needed? Write "N/A" if it can't be confirmed from the diff or commits. -->

## Testing

<!-- Check only what you actually ran. -->

- [ ] Lint
- [ ] Unit tests
- [ ] Build
- [ ] Manually verified

## Screenshots

<!-- Only for UI changes. Otherwise "N/A". -->

## Notes for reviewers

<!-- Where to look closely, known limitations, follow-ups. "N/A" if none. -->
```

Replace the testing checklist with the project's real verification commands (see its README, CONTRIBUTING, or AGENTS.md). If the project has a contributing guide with extra requirements (changelog entry, DCO sign-off, CLA), mention in the final report that they may still be needed; don't invent them in the body.
