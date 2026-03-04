/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: '\n  query CanRepoAutoMerge($owner: String!, $repo: String!) {\n    repository(owner: $owner, name: $repo) {\n      id\n      autoMergeAllowed\n    }\n  }\n'): typeof import('./graphql.js').CanRepoAutoMergeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: '\n  mutation EnablePullRequestAutoMerge(\n    $pullRequestId: ID!\n    $mergeMethod: PullRequestMergeMethod\n  ) {\n    enablePullRequestAutoMerge(\n      input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }\n    ) {\n      clientMutationId\n    }\n  }\n'): typeof import('./graphql.js').EnablePullRequestAutoMergeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export declare function graphql(source: '\n  query PullRequestAutoMergeable(\n    $owner: String!\n    $repo: String!\n    $pullRequestNumber: Int!\n  ) {\n    repository(owner: $owner, name: $repo) {\n      id\n      pullRequest(number: $pullRequestNumber) {\n        pullRequestId: id\n        viewerCanEnableAutoMerge\n      }\n    }\n  }\n'): typeof import('./graphql.js').PullRequestAutoMergeableDocument;
