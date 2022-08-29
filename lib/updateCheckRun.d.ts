import { Octokit } from "@octokit/core";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import { components } from "@octokit/openapi-types/types";
export declare function updateCheckRun(owner: string, repo: string, runId: number, conclusion: components["schemas"]["check-run"]["conclusion"], octokit: Octokit & Api): Promise<void>;
