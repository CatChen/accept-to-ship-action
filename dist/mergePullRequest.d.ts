import { Octokit } from "@octokit/core";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import { getMergeMethod } from "./getMergeMethod";
export declare function checkIfPullRequestMerged(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<boolean>;
export declare function mergePullRequest(owner: string, repo: string, pullRequestNumber: number, mergeMethod: ReturnType<typeof getMergeMethod>, octokit: Octokit & Api): Promise<void>;
