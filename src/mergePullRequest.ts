import { Octokit } from "@octokit/core";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";

export async function checkIfPullRequestMerged(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api
) {
  const response = await octokit.rest.pulls.checkIfMerged({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });

  if (response.status === 204) {
    return true;
  } else if (response.status === 404) {
    return false;
  } else {
    throw new Error(
      `Failed to check if pull request is merged: ${response.status}`
    );
  }
}

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
    throw new Error(`Failed to merge pull request: ${response.status}`);
  }
}
