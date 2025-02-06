import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
import { PullRequest } from '@octokit/webhooks-definitions/schema';
import { getMergeMethod } from './getMergeMethod';
export declare function enablePullRequestAutoMerge(owner: string, repo: string, pullRequest: PullRequest, pullRequestId: string, mergeMethod: ReturnType<typeof getMergeMethod>, octokit: Octokit & Api): Promise<void>;
