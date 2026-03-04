import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import type { Octokit } from '@octokit/core';
import type {
  Api,
  RestEndpointMethodTypes,
} from '@octokit/plugin-rest-endpoint-methods';
import { graphql } from './__graphql__/gql.js';

const queryPullRequestAutoMergeable = graphql(`
  query PullRequestAutoMergeable(
    $owner: String!
    $repo: String!
    $pullRequestNumber: Int!
  ) {
    repository(owner: $owner, name: $repo) {
      id
      pullRequest(number: $pullRequestNumber) {
        pullRequestId: id
        viewerCanEnableAutoMerge
      }
    }
  }
`);

export async function getPullRequestAutoMergeable(
  owner: string,
  repo: string,
  pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'],
  octokit: Octokit & Api,
): Promise<{
  pullRequestId: string;
  viewerCanEnableAutoMerge: boolean;
}> {
  const pullRequestNumber = pullRequest.number;
  const { repository } = await octokit.graphql<
    ResultOf<typeof queryPullRequestAutoMergeable>
  >(queryPullRequestAutoMergeable.toString(), {
    owner,
    repo,
    pullRequestNumber,
  } satisfies VariablesOf<typeof queryPullRequestAutoMergeable>);
  if (repository?.pullRequest == null) {
    throw new Error(
      `Failed to check if the pull request is auto-mergeable through GraphQL`,
    );
  }
  const { pullRequestId, viewerCanEnableAutoMerge } = repository.pullRequest;

  return {
    pullRequestId,
    viewerCanEnableAutoMerge,
  };
}
