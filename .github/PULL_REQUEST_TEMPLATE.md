# Pull Request

## Summary
<!-- What does this PR do? One or two sentences. -->

## Related issue
<!-- e.g. Fixes #12 -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Deploy / CI / config
- [ ] Docs

## Testing done
<!-- Be specific: unit tests, manual dev steps, curl outputs, screenshots. -->
- [ ] `pnpm exec opennextjs-cloudflare build` passes
- [ ] Tested on **dev** worker (https://mememint-dev.snipercryptotradingbot.workers.dev)
- [ ] API endpoints exercised (which paths, expected results)

## Deployment notes
- [ ] Requires D1 migration (migrations/ folder — new file)
- [ ] Requires new env var / secret
- [ ] Requires Solana program re-deploy to devnet

## Checklist
- [ ] I ran lint/typechecks if available
- [ ] No secrets or keys added to the repo
- [ ] Needs QA stamp before merge to `qa`/`main` (`needs-qa` label)

<!-- Reminders: pushes to dev auto-deploy dev; merging to qa/main runs the staged pipeline. -->