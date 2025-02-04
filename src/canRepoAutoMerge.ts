import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';

export async function canRepoAutoMerge(
  owner: string,
  repo: string,
  octokit: Octokit & Api,
): Promise<boolean> {
  const {
    repository: { autoMergeAllowed },
  } = await octokit.graphql<{
    repository: { autoMergeAllowed: boolean };
  }>(
    `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          autoMergeAllowed
        }
      }
    `,
    {
      owner,
      repo,
    },
  );
  return autoMergeAllowed;
}
