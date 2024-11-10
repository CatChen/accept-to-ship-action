# accept-to-ship-action

[![Build](https://github.com/CatChen/accept-to-ship-action/actions/workflows/build.yml/badge.svg?branch=main&event=push)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/build.yml)
[![Test](https://github.com/CatChen/accept-to-ship-action/actions/workflows/test.yml/badge.svg?branch=main&event=push)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/test.yml)
[![ESLint](https://github.com/CatChen/accept-to-ship-action/actions/workflows/eslint.yml/badge.svg?branch=main&event=push)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/eslint.yml)
[![CodeQL](https://github.com/CatChen/accept-to-ship-action/actions/workflows/codeql.yml/badge.svg?branch=main&event=schedule)](https://github.com/CatChen/accept-to-ship-action/actions/workflows/codeql.yml)

Want to merge a Pull Request automatically after someone approved it? Set up this Action and add a `#accept2ship` hashtag to the Pull Request. It will be merged automatically without involving you or the approver.

## Examples

```yaml
name: Ship

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
    name: Accept to Ship
    if: |-
      ${{
        github.base_ref == 'main' ||
        github.event.pull_request.base.ref == 'main' ||
        contains(github.event.check_run.pull_requests.*.base.ref, 'main') ||
        contains(github.event.check_suite.pull_requests.*.base.ref, 'main') ||
        contains(github.event.workflow_run.pull_requests.*.base.ref, 'main')
      }}
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: write
    steps:
      - uses: actions/checkout@v3

      - uses: CatChen/accept-to-ship-action@v0.3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }} # optional
          merge-method: merge # optional
          timeout: 0 # optional
          checks-watch-interval: 10 # optional
          fail-if-timeout: false # optional
          request-zero-accept-zero: false # optional
          custom-hashtag: '#accept2ship' #optional

  pass-to-ship:
    name: Pass to Ship
    if: |-
      ${{
        github.base_ref == 'main' ||
        github.event.pull_request.base.ref == 'main' ||
        contains(github.event.check_run.pull_requests.*.base.ref, 'main') ||
        contains(github.event.check_suite.pull_requests.*.base.ref, 'main') ||
        contains(github.event.workflow_run.pull_requests.*.base.ref, 'main')
      }}
    runs-on: ubuntu-latest
    permissions: write-all
    steps:
      - uses: actions/checkout@v3

      - uses: CatChen/accept-to-ship-action@v0.3
        with:
          request-zero-accept-zero: true
          custom-hashtag: '#pass2ship'
```

## Options

### `github-token`

The default value is `${{ github.token }}`, which is the GitHub token generated for this workflow. You can [create a different token with a different set of permissions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and use it here as well.

### `merge-method`

The merge method to use when this Action is triggered. Possible values are `merge`, `squash` or `rebase`. The default value is `merge`.

### `timeout`

How much time to wait for checks before giving up. This needs to be an integer in seconds. The default value is `0`.

### `checks-watch-interval`

How much time to wait before refreshing the checks again before they are completed. This needs to be an integer in seconds. The default value is `10` seconds.

### `fail-if-timeout`

When this option is set to `true` this Action will fail if its execution time (including the time waiting for checks) exceeds the value set in `timeout`.

### `custom-hashtag`

Change `#accept2ship` to another hashtag. Use multiple instances of this Action with different configurations and different hashtags. The default value is `#accept2ship`.

### `request-zero-accept-zero`

When this option is set to `true` this Action will not wait for any approval if no review was requested. Otherwise, this Action will wait for at least one approval if no review was requested. It's useful to set this to `true` with a different hashtag set in `custom-hashtag` to merge certain Pull Requests after running and passing all the checks. See the `#pass2ship` configuration in the examples from above. The default value is `false`.

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

### How do I use Action this with stacked Pull Requests?

Limit this Action to the branches that are directly based on the main branch (usually `main` or `master`). It will merge the bottom Pull Request to the main branch. The Pull Request right above that will become the new bottom Pull Request. This Action will start merging that Pull Request, too. This process will continue itself until all mergeable Pull Requests in the stack are merged. See the `jobs.accept-to-ship.if` block in the example from above as a reference.
