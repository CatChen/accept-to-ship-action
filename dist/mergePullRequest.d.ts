import { Octokit } from "@octokit/core";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
export declare function mergePullRequest(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<void>;
