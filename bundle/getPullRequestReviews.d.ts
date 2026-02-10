import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
export declare function getPullRequestReviews(owner: string, repo: string, pullRequestNumber: number, octokit: Octokit & Api): Promise<{
    id: number;
    node_id: string;
    user: import("@octokit/openapi-types").components["schemas"]["nullable-simple-user"];
    body: string;
    state: string;
    html_url: string;
    pull_request_url: string;
    _links: {
        html: {
            href: string;
        };
        pull_request: {
            href: string;
        };
    };
    submitted_at?: string;
    commit_id: string | null;
    body_html?: string;
    body_text?: string;
    author_association: import("@octokit/openapi-types").components["schemas"]["author-association"];
}[]>;
