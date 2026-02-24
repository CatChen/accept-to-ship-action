import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
export declare function getRequiredChecks(owner: string, repo: string, branch: string, octokit: Octokit & Api): Promise<string[]>;
