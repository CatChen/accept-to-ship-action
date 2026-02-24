import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import { warning } from '@actions/core';

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  if (!('status' in error)) {
    return undefined;
  }
  if (typeof error.status !== 'number') {
    return undefined;
  }
  return error.status;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function uniqueContexts(contexts: string[]) {
  return [...new Set(contexts)];
}

export async function getRequiredCheckContexts(
  owner: string,
  repo: string,
  branch: string,
  octokit: Octokit & Api,
) {
  try {
    const response = await octokit.rest.repos.getBranchRules({
      owner,
      repo,
      branch,
    });
    const contexts = response.data
      .filter((rule) => rule.type === 'required_status_checks')
      .flatMap(
        (rule) =>
          'parameters' in rule
            ? (rule.parameters?.required_status_checks ?? [])
            : [],
      )
      .map((requiredStatusCheck) => requiredStatusCheck.context)
      .filter(
        (context): context is string => context.trim().length > 0,
      );
    return uniqueContexts(contexts);
  } catch (error: unknown) {
    const status = getStatusCode(error);
    if (status !== 404) {
      warning(
        `Failed to fetch required checks from rules API for ${owner}/${repo}#${branch}: ${getErrorMessage(
          error,
        )}`,
      );
      return [];
    }
  }

  try {
    const response = await octokit.rest.repos.getStatusChecksProtection({
      owner,
      repo,
      branch,
    });
    return uniqueContexts([
      ...response.data.contexts,
      ...response.data.checks.map((check) => check.context),
    ]);
  } catch (error: unknown) {
    const status = getStatusCode(error);
    if (status !== 403 && status !== 404) {
      warning(
        `Failed to fetch required checks from branch protection API for ${owner}/${repo}#${branch}: ${getErrorMessage(
          error,
        )}`,
      );
    }
    return [];
  }
}
