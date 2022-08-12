import { Octokit } from "@octokit/core";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import { components } from "@octokit/openapi-types/types";

export async function getCheckRuns(
  owner: string,
  repo: string,
  ref: string,
  octokit: Octokit & Api
) {
  const response = await octokit.rest.checks.listForRef({
    owner,
    repo,
    ref,
  });
  return response.data.check_runs as components["schemas"]["check-run"][];
}
