import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import { getMergeMethod } from './getMergeMethod.js';
export declare function mergePullRequest(owner: string, repo: string, pullRequestNumber: number, mergeMethod: ReturnType<typeof getMergeMethod>, octokit: Octokit & Api): Promise<void>;
