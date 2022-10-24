import { getMergeMethod } from "./getMergeMethod";
import type { Octokit } from "@octokit/core";
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
export declare function checkIfPullRequestMerged(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<boolean>;
export declare function mergePullRequest(owner: string, repo: string, pullRequestNumber: number, mergeMethod: ReturnType<typeof getMergeMethod>, octokit: Octokit & Api): Promise<void>;
