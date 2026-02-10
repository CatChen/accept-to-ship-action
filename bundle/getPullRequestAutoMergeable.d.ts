import type { Octokit } from '@octokit/core';
import type { Api, RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
export declare function getPullRequestAutoMergeable(owner: string, repo: string, pullRequest: RestEndpointMethodTypes['pulls']['get']['response']['data'], octokit: Octokit & Api): Promise<{
    pullRequestId: string;
    viewerCanEnableAutoMerge: boolean;
}>;
