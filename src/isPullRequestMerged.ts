import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { RequestError } from '@octokit/request-error';

export async function isPullRequestMerged(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api,
) {
  try {
    const { status } = await octokit.rest.pulls.checkIfMerged({
      owner,
      repo,
      pull_number: pullRequestNumber,
    });
    if (status === 204) {
      return true;
    } else {
      return false;
    }
  } catch (requestError) {
    if (requestError instanceof RequestError) {
      if (requestError.status === 204) {
        return true;
      } else if (requestError.status === 404) {
        return false;
      } else {
        throw new Error(
          `Failed to check if pull request is merged: [${requestError.status}] ${requestError.message}`,
        );
      }
    } else {
      throw requestError;
    }
  }
}
