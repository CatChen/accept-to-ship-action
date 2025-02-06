import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { PullRequest } from '@octokit/webhooks-types/schema';
export declare function getPullRequestAutoMergeable(owner: string, repo: string, pullRequest: PullRequest, octokit: Octokit & Api): Promise<{
    pullRequestId: string;
    viewerCanEnableAutoMerge: boolean;
}>;
