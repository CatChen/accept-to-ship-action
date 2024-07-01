import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import type { PullRequest } from '@octokit/webhooks-definitions/schema';
export declare function getPullRequest(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<PullRequest>;
