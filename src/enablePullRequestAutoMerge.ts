import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import type { Octokit } from '@octokit/core';
import type {
  Api,
  RestEndpointMethodTypes,
} from '@octokit/plugin-rest-endpoint-methods';
import { error, info, setFailed, setOutput, warning } from '@actions/core';
import { context } from '@actions/github';
import { GraphqlResponseError } from '@octokit/graphql';
import { RequestError } from '@octokit/request-error';
import { graphql } from './__graphql__/gql.js';
import { getMergeMethod } from './getMergeMethod.js';
import { isPullRequestMerged } from './isPullRequestMerged.js';

const mutationEnablePullRequestAutoMerge = graphql(`
  mutation EnablePullRequestAutoMerge(
    $pullRequestId: ID!
    $mergeMethod: PullRequestMergeMethod
  ) {
    enablePullRequestAutoMerge(
      input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }
    ) {
      clientMutationId
    }
  }
`);

export async function enablePullRequestAutoMerge(
  owner: string,
  repo: string,
  pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'],
  pullRequestId: string,
  mergeMethod: ReturnType<typeof getMergeMethod>,
  octokit: Octokit & Api,
): Promise<boolean> {
  const pullRequestNumber = pullRequest.number;
  try {
    await octokit.graphql<ResultOf<typeof mutationEnablePullRequestAutoMerge>>(
      mutationEnablePullRequestAutoMerge.toString(),
      {
        pullRequestId,
        mergeMethod: mergeMethod.toUpperCase() as Uppercase<typeof mergeMethod>,
      } satisfies VariablesOf<typeof mutationEnablePullRequestAutoMerge>,
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
    return true;
  } catch (requestError) {
    if (requestError instanceof RequestError) {
      warning(
        `Failed to enable auto-merge for the Pull Request: [${requestError.status}] ${requestError.message}`,
      );
    } else if (requestError instanceof GraphqlResponseError) {
      for (const graphqlError of requestError.errors ?? []) {
        warning(
          `Failed to enable auto-merge for the Pull Request: ${graphqlError.message}`,
        );
      }
    } else {
      throw requestError;
    }

    // If it's merged by someone else in a race condition we treat it as skipped,
    // because it's the same as someone else merged it before we try.
    const merged = await isPullRequestMerged(
      owner,
      repo,
      pullRequestNumber,
      octokit,
    );
    setOutput('skipped', !merged);
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
      return false;
    } else {
      // If it's not merged by someone else in a race condition then we treat it as a real error.
      error(`This Pull Request remains unmerged.`);
      setFailed(
        `Failed to enable auto-merge for this Pull Request when conditions are met.`,
      );
      return false;
    }
  }
}
