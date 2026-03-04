/* eslint-disable */
import * as types from './graphql.js';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  '\n  query CanRepoAutoMerge($owner: String!, $repo: String!) {\n    repository(owner: $owner, name: $repo) {\n      id\n      autoMergeAllowed\n    }\n  }\n': typeof types.CanRepoAutoMergeDocument;
  '\n  mutation EnablePullRequestAutoMerge(\n    $pullRequestId: ID!\n    $mergeMethod: PullRequestMergeMethod\n  ) {\n    enablePullRequestAutoMerge(\n      input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }\n    ) {\n      clientMutationId\n    }\n  }\n': typeof types.EnablePullRequestAutoMergeDocument;
  '\n  query PullRequestAutoMergeable(\n    $owner: String!\n    $repo: String!\n    $pullRequestNumber: Int!\n  ) {\n    repository(owner: $owner, name: $repo) {\n      id\n      pullRequest(number: $pullRequestNumber) {\n        pullRequestId: id\n        viewerCanEnableAutoMerge\n      }\n    }\n  }\n': typeof types.PullRequestAutoMergeableDocument;
};
const documents: Documents = {
  '\n  query CanRepoAutoMerge($owner: String!, $repo: String!) {\n    repository(owner: $owner, name: $repo) {\n      id\n      autoMergeAllowed\n    }\n  }\n':
    types.CanRepoAutoMergeDocument,
  '\n  mutation EnablePullRequestAutoMerge(\n    $pullRequestId: ID!\n    $mergeMethod: PullRequestMergeMethod\n  ) {\n    enablePullRequestAutoMerge(\n      input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }\n    ) {\n      clientMutationId\n    }\n  }\n':
    types.EnablePullRequestAutoMergeDocument,
  '\n  query PullRequestAutoMergeable(\n    $owner: String!\n    $repo: String!\n    $pullRequestNumber: Int!\n  ) {\n    repository(owner: $owner, name: $repo) {\n      id\n      pullRequest(number: $pullRequestNumber) {\n        pullRequestId: id\n        viewerCanEnableAutoMerge\n      }\n    }\n  }\n':
    types.PullRequestAutoMergeableDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query CanRepoAutoMerge($owner: String!, $repo: String!) {\n    repository(owner: $owner, name: $repo) {\n      id\n      autoMergeAllowed\n    }\n  }\n',
): typeof import('./graphql.js').CanRepoAutoMergeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  mutation EnablePullRequestAutoMerge(\n    $pullRequestId: ID!\n    $mergeMethod: PullRequestMergeMethod\n  ) {\n    enablePullRequestAutoMerge(\n      input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }\n    ) {\n      clientMutationId\n    }\n  }\n',
): typeof import('./graphql.js').EnablePullRequestAutoMergeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query PullRequestAutoMergeable(\n    $owner: String!\n    $repo: String!\n    $pullRequestNumber: Int!\n  ) {\n    repository(owner: $owner, name: $repo) {\n      id\n      pullRequest(number: $pullRequestNumber) {\n        pullRequestId: id\n        viewerCanEnableAutoMerge\n      }\n    }\n  }\n',
): typeof import('./graphql.js').PullRequestAutoMergeableDocument;

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
