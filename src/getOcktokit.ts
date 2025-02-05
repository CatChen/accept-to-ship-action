import { error, info, warning } from '@actions/core';
import { GitHub, getOctokitOptions } from '@actions/github/lib/utils.js';
import { type Octokit } from '@octokit/core/dist-types/index.js';
import { type PaginateInterface } from '@octokit/plugin-paginate-rest';
import { type Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types.js';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';

export function getOctokit(githubToken: string): Octokit &
  Api & {
    paginate: PaginateInterface;
  } {
  const Octokit = GitHub.plugin(throttling, retry);
  const octokit = new Octokit(
    getOctokitOptions(githubToken, {
      throttle: {
        onRateLimit: (retryAfter, options, _, retryCount) => {
          if (retryCount === 0) {
            warning(
              `Request quota exhausted for request ${options.method} ${options.url}`,
            );
            info(`Retrying after ${retryAfter} seconds!`);
            return true;
          } else {
            error(
              `Request quota exhausted for request ${options.method} ${options.url}`,
            );
          }
        },
        onSecondaryRateLimit: (retryAfter, options, _, retryCount) => {
          if (retryCount === 0) {
            warning(
              `Abuse detected for request ${options.method} ${options.url}`,
            );
            info(`Retrying after ${retryAfter} seconds!`);
            return true;
          } else {
            warning(
              `Abuse detected for request ${options.method} ${options.url}`,
            );
          }
        },
      },
      retry: {
        doNotRetry: ['403', '429'],
      },
    }),
  );
  octokit.graphql = octokit.graphql.defaults({
    headers: {
      'X-GitHub-Next-Global-ID': 1,
    },
  });
  return octokit;
}
