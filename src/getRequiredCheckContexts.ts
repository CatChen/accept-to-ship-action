import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
import { warning } from '@actions/core';

type RuleWithRequiredStatusChecks = {
  type: string;
  parameters?: {
    required_status_checks?: Array<{
      context?: string;
    }>;
  };
};

type RequiredStatusChecksPolicy = {
  contexts: string[];
  checks: Array<{
    context: string;
  }>;
};

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
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/rules/branches/{branch}',
      {
        owner,
        repo,
        branch,
        per_page: 100,
      },
    );
    const rules = response.data as RuleWithRequiredStatusChecks[];
    const contexts = rules
      .filter((rule) => rule.type === 'required_status_checks')
      .flatMap((rule) => rule.parameters?.required_status_checks ?? [])
      .map((requiredStatusCheck) => requiredStatusCheck.context)
      .filter(
        (context): context is string =>
          context !== undefined && context.trim().length > 0,
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
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks',
      {
        owner,
        repo,
        branch,
      },
    );
    const policy = response.data as RequiredStatusChecksPolicy;
    return uniqueContexts([
      ...policy.contexts,
      ...policy.checks.map((check) => check.context),
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
