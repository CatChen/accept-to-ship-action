import type { Octokit } from '@octokit/core';
import type {
  Api,
  RestEndpointMethodTypes,
} from '@octokit/plugin-rest-endpoint-methods';

export async function getPullRequest(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api,
): Promise<RestEndpointMethodTypes['pulls']['get']['response']['data']> {
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });
  return response.data;
}
