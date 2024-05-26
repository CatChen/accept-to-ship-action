import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';

export async function getPullRequestReviewRequests(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api,
) {
  const response = await octokit.rest.pulls.listRequestedReviewers({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });
  return response.data;
}
