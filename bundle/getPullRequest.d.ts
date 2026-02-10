import type { Octokit } from '@octokit/core';
import type { Api, RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
export declare function getPullRequest(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<RestEndpointMethodTypes['pulls']['get']['response']['data']>;
