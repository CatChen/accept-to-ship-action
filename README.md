# accept-to-ship-action

[![Build](https://github.com/CatChen/accept-to-ship-action/actions/workflows/build.yml/badge.svg)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/build.yml)
[![Test](https://github.com/CatChen/accept-to-ship-action/actions/workflows/test.yml/badge.svg)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/test.yml)
[![ESLint](https://github.com/CatChen/accept-to-ship-action/actions/workflows/eslint.yml/badge.svg)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/eslint.yml)
[![CodeQL](https://github.com/CatChen/accept-to-ship-action/actions/workflows/codeql.yml/badge.svg)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/codeql.yml)
[![Ship](https://github.com/CatChen/accept-to-ship-action/actions/workflows/ship.yml/badge.svg)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/ship.yml)

Want to merge a Pull Request automatically after someone approved it? Set up this Action and add a `#accept2ship` hashtag to the Pull Request. It will be merged automatically without involving you or the approver.

## Examples

name: Test Pull Request

```yaml
name: Accept to Ship

on:
  pull_request:
    types:
      [
        labeled,
        unlabeled,
        edited,
        closed,
        reopened,
        synchronize,
        review_requested,
        review_request_removed,
      ]
  pull_request_review:
    types: [submitted, edited, dismissed]
  check_run:
    type: [created, rerequested, completed]
  check_suite:
    types: [completed]
  workflow_run:
    workflows: []
    types: [completed]

concurrency:
  group: ${{ github.event.pull_request.number || github.workflow }}
  cancel-in-progress: true

jobs:
  accept_to_ship:
    name: Ship
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: CatChen/accept-to-ship-action@v0.2.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }} # optional
          merge-method: merge # optional
          timeout: 600 # optional
          checks-watch-interval: 10 # optional
          fail-if-timeout: false # optinal
```

## Options

### `github-token`

The default value is `${{ github.token }}`, which is the GitHub token generated for this workflow. You can [create a different token with a different set of permissions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and use it here as well.

### `merge-method`

The merge method to use when this Action is triggered. Possible values are `merge`, `squash` or `rebase`. The default value is `merge`.

### `timeout`

How much time to wait for checks before giving up. This needs to be an integer in seconds. The default value is `600` (10 minutes).

### `checks-watch-interval`

How much time to wait before refreshing the checks again before they are completed. This needs to be an integer in seconds. The default value is `10` seconds.

### `fail-if-timeout`

When this option is set to `true` this Action will fail if its execution time (including the time waiting for checks) exceeds the value set in `timeout`.

## FAQ

### Where do I need to put the `#accept2ship` hashtag?

It can be in a Pull Request's title, body or comment. When it's in a comment the comment needs to have the same author as the Pull Request. (Option to allow `#accept2ship` in any comment is in the roadmap.)

It can be a Label named `accept2ship` as well. No `#` sign in this case.

### When is a Pull Request considered approved by this Action?

If reviewers are requested this Action waits for approvals from all requested reviewers. (Team reviewers are ignored in the current version. Support for team reviewers is on the roadmap.)

If no reviewer is requested then any approval is enough.

### Does this Action wait for other checks?

Yes. It waits for other checks. Other checks need to be completed and their conclusions have to be either "success", "neutral" or "skipped". (The options to configurate check requirements may be added in the future.)

The check from the Workflow that runs this Action doesn't count. It will always be in progress without conclusion when this Action is running. This Action ignores the Workflow instance that's running this Action and all instances of the same Workflow.

### The successful completion of my other Workflow doesn't trigger this Workflow.

> When you use the repository's `GITHUB_TOKEN` to perform tasks, events triggered by the `GITHUB_TOKEN` will not create a new workflow run. This prevents you from accidentally creating recursive workflow runs. -- [Source](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)

Please list your other Workflows in the `workflows` field under the `workflow_run` trigger. Put them into the empty bracket in the example from above. When they complete they will trigger this Action.
