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
    app: {
        id: number;
        slug?: string;
        node_id: string;
        client_id?: string;
        owner: {
            name?: string | null;
            email?: string | null;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string | null;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
            user_view_type?: string;
        } | {
            description?: string | null;
            html_url: string;
            website_url?: string | null;
            id: number;
            node_id: string;
            name: string;
            slug: string;
            created_at: string | null;
            updated_at: string | null;
            avatar_url: string;
        };
        name: string;
        description: string | null;
        external_url: string;
        html_url: string;
        created_at: string;
        updated_at: string;
        permissions: {
            issues?: string;
            checks?: string;
            metadata?: string;
            contents?: string;
            deployments?: string;
            [key: string]: string | undefined;
        };
        events: string[];
        installations_count?: number;
    } | null;
    pull_requests: {
        id: number;
        number: number;
        url: string;
        head: {
            ref: string;
            sha: string;
            repo: {
                id: number;
                url: string;
                name: string;
            };
        };
        base: {
            ref: string;
            sha: string;
            repo: {
                id: number;
                url: string;
                name: string;
            };
        };
    }[];
    deployment?: {
        url: string;
        id: number;
        node_id: string;
        task: string;
        original_environment?: string;
        environment: string;
        description: string | null;
        created_at: string;
        updated_at: string;
        statuses_url: string;
        repository_url: string;
        transient_environment?: boolean;
        production_environment?: boolean;
        performed_via_github_app?: {
            id: number;
            slug?: string;
            node_id: string;
            client_id?: string;
            owner: {
                name?: string | null;
                email?: string | null;
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string | null;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
                starred_at?: string;
                user_view_type?: string;
            } | {
                description?: string | null;
                html_url: string;
                website_url?: string | null;
                id: number;
                node_id: string;
                name: string;
                slug: string;
                created_at: string | null;
                updated_at: string | null;
                avatar_url: string;
            };
            name: string;
            description: string | null;
            external_url: string;
            html_url: string;
            created_at: string;
            updated_at: string;
            permissions: {
                issues?: string;
                checks?: string;
                metadata?: string;
                contents?: string;
                deployments?: string;
                [key: string]: string | undefined;
            };
            events: string[];
            installations_count?: number;
        } | null;
    };
}[]>;
