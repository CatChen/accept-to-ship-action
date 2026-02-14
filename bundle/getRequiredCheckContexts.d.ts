import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
export declare function getRequiredCheckContexts(owner: string, repo: string, branch: string, octokit: Octokit & Api): Promise<string[]>;
