import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
export declare function isPullRequestMerged(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<boolean>;
