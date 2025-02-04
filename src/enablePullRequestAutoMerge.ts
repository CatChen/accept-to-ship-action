import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { info } from 'console';
import { error, setFailed, setOutput, warning } from '@actions/core';
import { context } from '@actions/github';
import { RequestError } from '@octokit/request-error';
import { getMergeMethod } from './getMergeMethod';
import { isPullRequestMerged } from './isPullRequestMerged';

export async function enablePullRequestAutoMerge(
  owner: string,
  repo: string,
  pullRequestNumber: number,
  mergeMethod: ReturnType<typeof getMergeMethod>,
  octokit: Octokit & Api,
) {
  try {
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

    if (!viewerCanEnableAutoMerge) {
      error(`Auto-merge is not allowed for this Pull Request`);
      throw new Error(`Auto-merge is not allowed for this Pull Request`);
    }

    await octokit.graphql<unknown>(
      `
        mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod) {
          enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) {
          }
        }
      `,
      {
        pullRequestId,
        mergeMethod: mergeMethod.toUpperCase() as Uppercase<typeof mergeMethod>,
      },
    );

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
        body: `Auto-merge is enabled by a [GitHub Action](${job.html_url})`,
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
        `Failed to enable auto-merge for the Pull Request: [${requestError.status}] ${requestError.message}`,
      );

      // If it's merged by someone else in a race condition we treat it as skipped,
      // because it's the same as someone else merged it before we try.
      const merged = await isPullRequestMerged(
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
