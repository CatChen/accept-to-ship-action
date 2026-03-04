import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import { graphql } from './__graphql__/gql.js';

const queryCanRepoAutoMerge = graphql(`
  query CanRepoAutoMerge($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      id
      autoMergeAllowed
    }
  }
`);

export async function canRepoAutoMerge(
  owner: string,
  repo: string,
  octokit: Octokit & Api,
): Promise<boolean> {
  const { repository } = await octokit.graphql<
    ResultOf<typeof queryCanRepoAutoMerge>
  >(queryCanRepoAutoMerge.toString(), {
    owner,
    repo,
  } satisfies VariablesOf<typeof queryCanRepoAutoMerge>);
  return repository?.autoMergeAllowed ?? false;
}
