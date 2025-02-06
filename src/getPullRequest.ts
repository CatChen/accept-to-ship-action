import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import type { PullRequest } from '@octokit/webhooks-types/schema';

export async function getPullRequest(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api,
) {
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });
  return response.data as PullRequest;
}
