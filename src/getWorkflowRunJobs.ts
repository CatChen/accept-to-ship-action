import { context } from "@actions/github";

import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import type { components } from "@octokit/openapi-types/types";

export async function getWorkflowRunJobs(
  owner: string,
  repo: string,
  octokit: Octokit & Api
) {
  const response = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: context.runId,
  });
  return response.data.jobs as components["schemas"]["job"][];
}
