import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
export declare function getPullRequestReviewRequests(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<{
    users: import("@octokit/openapi-types").components["schemas"]["simple-user"][];
    teams: import("@octokit/openapi-types").components["schemas"]["team"][];
}>;
