import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';

/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };

/** Represents available types of methods to use when merging a pull request. */
export type PullRequestMergeMethod =
  /** Add all commits from the head branch to the base branch with a merge commit. */
  | 'MERGE'
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

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<
    DocumentTypeDecoration<TResult, TVariables>['__apiType']
  >;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const CanRepoAutoMergeDocument = new TypedDocumentString(`
    query CanRepoAutoMerge($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    id
    autoMergeAllowed
  }
}
    `) as unknown as TypedDocumentString<
  CanRepoAutoMergeQuery,
  CanRepoAutoMergeQueryVariables
>;
export const EnablePullRequestAutoMergeDocument = new TypedDocumentString(`
    mutation EnablePullRequestAutoMerge($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod) {
  enablePullRequestAutoMerge(
    input: {pullRequestId: $pullRequestId, mergeMethod: $mergeMethod}
  ) {
    clientMutationId
  }
}
    `) as unknown as TypedDocumentString<
  EnablePullRequestAutoMergeMutation,
  EnablePullRequestAutoMergeMutationVariables
>;
export const PullRequestAutoMergeableDocument = new TypedDocumentString(`
    query PullRequestAutoMergeable($owner: String!, $repo: String!, $pullRequestNumber: Int!) {
  repository(owner: $owner, name: $repo) {
    id
    pullRequest(number: $pullRequestNumber) {
      pullRequestId: id
      viewerCanEnableAutoMerge
    }
  }
}
    `) as unknown as TypedDocumentString<
  PullRequestAutoMergeableQuery,
  PullRequestAutoMergeableQueryVariables
>;
