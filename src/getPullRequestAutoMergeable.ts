import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { PullRequest } from '@octokit/webhooks-types/schema';

export async function getPullRequestAutoMergeable(
  owner: string,
  repo: string,
  pullRequest: PullRequest,
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
