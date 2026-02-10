import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
export declare function getCheckRuns(owner: string, repo: string, ref: string, octokit: Octokit & Api): Promise<{
    id: number;
    head_sha: string;
    node_id: string;
    external_id: string | null;
    url: string;
    html_url: string | null;
    details_url: string | null;
    status: "queued" | "in_progress" | "completed" | "waiting" | "requested" | "pending";
    conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
    started_at: string | null;
    completed_at: string | null;
    output: {
        title: string | null;
        summary: string | null;
        text: string | null;
        annotations_count: number;
        annotations_url: string;
    };
    name: string;
    check_suite: {
        id: number;
    } | null;
    app: import("@octokit/openapi-types").components["schemas"]["nullable-integration"];
    pull_requests: import("@octokit/openapi-types").components["schemas"]["pull-request-minimal"][];
    deployment?: import("@octokit/openapi-types").components["schemas"]["deployment-simple"];
}[]>;
