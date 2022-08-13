# accept-to-ship-action

![build status badge](https://github.com/CatChen/accept-to-ship-action/actions/workflows/build.yml/badge.svg?event=push)
![eslint status badge](https://github.com/CatChen/accept-to-ship-action/actions/workflows/eslint.yml/badge.svg)

Want to merge a Pull Request automatically after someone approved it? Set up this Action and add a `#accept2ship` hashtag to the Pull Request. It will be merged automatically without involving you or the approver.

## Examples

name: Test Pull Request

```yaml
name: Accept to Ship

on:
  pull_request:
    types: [labeled, opened, edited, reopened, synchronize]
  check_run:
    types: [completed]
  check_suite:
    types: [completed]
  pull_request_review:
    types: [submitted, edited]

jobs:
  accept_to_ship:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: CatChen/accept-to-ship-action@v0.2.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }} # optional
          merge-method: merge # optional
```

## Options

### `github-token`

The default value is `${{ github.token }}`, which is the GitHub token generated for this workflow. You can [create a different token with a different set of permissions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and use it here as well.

### `merge-method`

The merge method to use when this Action is triggered. Possible values are `merge`, `squash` or `rebase`. The default value is `merge`.

## FAQ

### Where do I need to put the `#accept2ship` hashtag?

It can be in a Pull Request's title, body or comment. When it's in a comment the comment needs to have the same author as the Pull Request. (Option to allow `#accept2ship` in any comment is in the roadmap.)

It can be a Label named `accept2ship` as well. No `#` sign in this case.

### When is a Pull Request considered approved by this Action?

If reviewers are requested this Action waits for approvals from all requested reviewers. (Team reviewers are ignored in the current version. Support for team reviewers is on the roadmap.)

If no reviewer is requested then any approval is enough.

### Does this Action wait for other checks?

Yes. It waits for other checks. Other checks need to be completed and their conclusions have to be either "success", "neutral" or "skipped". (The options to configurate check requirements may be added in the future.)

The check from the Workflow that runs this Action doesn't count. It will always be in progress without conclusion when this Action is running.
