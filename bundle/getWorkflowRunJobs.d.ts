import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';
export declare function getWorkflowRunJobs(owner: string, repo: string, octokit: Octokit & Api): Promise<{
    id: number;
    run_id: number;
    run_url: string;
    run_attempt?: number;
    node_id: string;
    head_sha: string;
    url: string;
    html_url: string | null;
    status: "queued" | "in_progress" | "completed" | "waiting";
    conclusion: "success" | "failure" | "neutral" | "cancelled" | "skipped" | "timed_out" | "action_required" | null;
    created_at: string;
    started_at: string;
    completed_at: string | null;
    name: string;
    steps?: {
        status: "queued" | "in_progress" | "completed";
        conclusion: string | null;
        name: string;
        number: number;
        started_at?: string | null;
        completed_at?: string | null;
    }[];
    check_run_url: string;
    labels: string[];
    runner_id: number | null;
    runner_name: string | null;
    runner_group_id: number | null;
    runner_group_name: string | null;
    workflow_name: string | null;
    head_branch: string | null;
}[]>;