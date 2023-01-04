import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { info } from 'console';
import { error, setFailed, setOutput, warning } from '@actions/core';
import { context } from '@actions/github';
import { RequestError } from '@octokit/request-error';
import { getMergeMethod } from './getMergeMethod';

export async function checkIfPullRequestMerged(
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
    try {
      info(`Run ID: ${context.runId}`);
      const { data: job } = await octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: context.runId,
      });
      info(`Job ID: ${job.id} (${job.html_url})`);
      const { data: comment } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullRequestNumber,
        body: 'This Pull Request is closed by a [GitHub Action](${job.html_url})',
      });
      info(`Comment is created: ${comment.html_url}`);
    } catch (requestError) {
      if (requestError instanceof RequestError) {
        info(
          `Failed to comment on the Pull Request: [${requestError.status}] ${requestError.message}`,
        );
      }
    }
  } catch (requestError) {
    if (requestError instanceof RequestError) {
      warning(
        `Failed to merge the Pull Request: [${requestError.status}] ${requestError.message}`,
      );

      // If it's merged by someone else in a race condition we treat it as skipped,
      // because it's the same as someone else merged it before we try.
      const merged = await checkIfPullRequestMerged(
        owner,
        repo,
        pullRequestNumber,
        octokit,
      );
      if (merged) {
        try {
          const { data: pullRequest } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullRequestNumber,
          });
          warning(
            `This Pull Request has been merged by: ${pullRequest.merged_by?.login} (${pullRequest.merged_by?.html_url})`,
          );
        } catch {
          warning(`This Pull Request has been merged by unknown user.`);
        }
      } else {
        // If it's not merged by someone else in a race condition then we treat it as a real error.
        error(`This Pull Request remains unmerged.`);
        setFailed(`Failed to merge this Pull Request when conditions are met.`);
      }
      setOutput('skipped', !merged);
    } else {
      throw requestError;
    }
  }
}
