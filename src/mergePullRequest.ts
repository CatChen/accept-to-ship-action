import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { setOutput, warning } from '@actions/core';
import { RequestError } from '@octokit/request-error';
import { getMergeMethod } from './getMergeMethod';

export async function checkIfPullRequestMerged(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  octokit: Octokit & Api,
) {
  let response: RequestError['response'];
  try {
    response = await octokit.rest.pulls.checkIfMerged({
      owner,
      repo,
      pull_number: pullRequestNumber,
    });
    if (response.status === 204) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (error instanceof RequestError) {
      if (error.status === 204) {
        return true;
      } else if (error.status === 404) {
        return false;
      } else {
        throw new Error(
          `Failed to check if pull request is merged: [${error.status}] ${error.message}`,
        );
      }
    } else {
      throw error;
    }
  }
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  mergeMethod: ReturnType<typeof getMergeMethod>,
  octokit: Octokit & Api,
) {
  try {
    await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: pullRequestNumber,
      merge_method: mergeMethod,
    });
    setOutput('skipped', false);
  } catch (error) {
    if (error instanceof RequestError) {
      warning(
        `Failed to merge pull request: [${error.status}] ${error.message}`,
      );

      // If it's merged by someone else in a race condition we treat it as skipped,
      // because it's the same as someone else merged it before we try.
      const merged = await checkIfPullRequestMerged(
        owner,
        repo,
        pullRequestNumber,
        octokit,
      );
      setOutput('skipped', !merged);
    } else {
      throw error;
    }
  }
}
