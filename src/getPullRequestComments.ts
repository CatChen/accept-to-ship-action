import type { Octokit } from '@octokit/core';
import type { components } from '@octokit/openapi-types';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';

export async function getPullRequestComments(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api,
) {
  const response = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });
  return response.data as components['schemas']['review-comment'][];
}
