import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { info, warning } from '@actions/core';
import { PullRequest } from '@octokit/webhooks-definitions/schema';
import { getPullRequest } from './getPullRequest';
import { isPullRequestMerged } from './isPullRequestMerged';

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
