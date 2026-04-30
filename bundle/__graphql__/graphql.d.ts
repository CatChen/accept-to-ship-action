import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends {
    [key: string]: unknown;
}> = {
    [K in keyof T]: T[K];
};
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | {
    [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
};
/** Represents available types of methods to use when merging a pull request. */
export type PullRequestMergeMethod = 
/** Add all commits from the head branch to the base branch with a merge commit. */
'MERGE'
/** Add all commits from the head branch onto the base branch individually. */
 | 'REBASE'
/** Combine all commits from the head branch into a single commit in the base branch. */
 | 'SQUASH';
export type CanRepoAutoMergeQueryVariables = Exact<{
    owner: string;
    repo: string;
}>;
export type CanRepoAutoMergeQuery = {
    __typename: 'Query';
    repository: {
        __typename: 'Repository';
        id: string;
        autoMergeAllowed: boolean;
    } | null;
};
export type EnablePullRequestAutoMergeMutationVariables = Exact<{
    pullRequestId: string | number;
    mergeMethod?: PullRequestMergeMethod | null | undefined;
}>;
export type EnablePullRequestAutoMergeMutation = {
    __typename: 'Mutation';
    enablePullRequestAutoMerge: {
        __typename: 'EnablePullRequestAutoMergePayload';
        clientMutationId: string | null;
    } | null;
};
export type PullRequestAutoMergeableQueryVariables = Exact<{
    owner: string;
    repo: string;
    pullRequestNumber: number;
}>;
export type PullRequestAutoMergeableQuery = {
    __typename: 'Query';
    repository: {
        __typename: 'Repository';
        id: string;
        pullRequest: {
            __typename: 'PullRequest';
            viewerCanEnableAutoMerge: boolean;
            pullRequestId: string;
        } | null;
    } | null;
};
export declare class TypedDocumentString<TResult, TVariables> extends String implements DocumentTypeDecoration<TResult, TVariables> {
    __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
    private value;
    __meta__?: Record<string, any> | undefined;
    constructor(value: string, __meta__?: Record<string, any> | undefined);
    toString(): string & DocumentTypeDecoration<TResult, TVariables>;
}
export declare const CanRepoAutoMergeDocument: TypedDocumentString<CanRepoAutoMergeQuery, CanRepoAutoMergeQueryVariables>;
export declare const EnablePullRequestAutoMergeDocument: TypedDocumentString<EnablePullRequestAutoMergeMutation, EnablePullRequestAutoMergeMutationVariables>;
export declare const PullRequestAutoMergeableDocument: TypedDocumentString<PullRequestAutoMergeableQuery, PullRequestAutoMergeableQueryVariables>;
export {};
