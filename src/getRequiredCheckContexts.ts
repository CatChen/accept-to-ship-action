import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import { warning } from '@actions/core';
import { RequestError } from '@octokit/request-error';

function uniqueContexts(contexts: string[]) {
  return [...new Set(contexts)];
}

export async function getRequiredCheckContexts(
  owner: string,
  repo: string,
  branch: string,
  octokit: Octokit & Api,
) {
  const requiredCheckContexts: string[] = [];

  try {
    const response = await octokit.rest.repos.getBranchRules({
      owner,
      repo,
      branch,
    });
    requiredCheckContexts.push(
      ...response.data
      .filter((rule) => rule.type === 'required_status_checks')
      .flatMap(
        (rule) =>
          'parameters' in rule
            ? (rule.parameters?.required_status_checks ?? [])
            : [],
      )
      .map((requiredStatusCheck) => requiredStatusCheck.context)
      .filter((context) => context.trim().length > 0),
    );
  } catch (requestError) {
    if (requestError instanceof RequestError) {
      if (requestError.status !== 404) {
        warning(
          `Failed to fetch required checks from rules API for ${owner}/${repo}#${branch}: [${requestError.status}] ${requestError.message}`,
        );
      }
    } else {
      throw requestError;
    }
  }

  try {
    const response = await octokit.rest.repos.getStatusChecksProtection({
      owner,
      repo,
      branch,
    });
    requiredCheckContexts.push(
      ...response.data.contexts,
      ...response.data.checks.map((check) => check.context),
    );
  } catch (requestError) {
    if (requestError instanceof RequestError) {
      if (requestError.status !== 403 && requestError.status !== 404) {
        warning(
          `Failed to fetch required checks from branch protection API for ${owner}/${repo}#${branch}: [${requestError.status}] ${requestError.message}`,
        );
      }
    } else {
      throw requestError;
    }
  }

  return uniqueContexts(requiredCheckContexts);
}
