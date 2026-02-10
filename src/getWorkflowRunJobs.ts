import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import { context } from '@actions/github';

export async function getWorkflowRunJobs(
  owner: string,
  repo: string,
  octokit: Octokit & Api,
) {
  const {
    data: { jobs },
  } = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: context.runId,
  });
  return jobs;
}
