import { Octokit } from "@octokit/core";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";

export async function mergePullRequest(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api
) {
  const response = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });
  if (response.status !== 200) {
    throw new Error(`Failed to merge pull request: ${pullRequestNumber}`);
  }
}
