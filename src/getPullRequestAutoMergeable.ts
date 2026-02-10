import type { Octokit } from '@octokit/core';
import type {
  Api,
  RestEndpointMethodTypes,
} from '@octokit/plugin-rest-endpoint-methods';

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
  const {
    repository: {
      pullRequest: { pullRequestId, viewerCanEnableAutoMerge },
    },
  } = await octokit.graphql<{
    repository: {
      pullRequest: {
        pullRequestId: string;
        viewerCanEnableAutoMerge: boolean;
      };
    };
  }>(
    `
        query($owner: String!, $repo: String!, $pullRequestNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $pullRequestNumber) {
              pullRequestId: id
              viewerCanEnableAutoMerge
            }
          }
        }
      `,
    {
      owner,
      repo,
      pullRequestNumber,
    },
  );

  return {
    pullRequestId,
    viewerCanEnableAutoMerge,
  };
}
