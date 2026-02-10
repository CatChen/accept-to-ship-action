import type { Octokit } from '@octokit/core';
import type { Api, RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { getMergeMethod } from './getMergeMethod.js';
export declare function enablePullRequestAutoMerge(owner: string, repo: string, pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'], pullRequestId: string, mergeMethod: ReturnType<typeof getMergeMethod>, octokit: Octokit & Api): Promise<void>;
