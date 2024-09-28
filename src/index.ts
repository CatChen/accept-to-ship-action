import type { components } from '@octokit/openapi-types/types';
import type {
  CheckRunEvent,
  CheckSuiteEvent,
  IssueCommentEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  WorkflowRunEvent,
} from '@octokit/webhooks-definitions/schema';
import { performance } from 'node:perf_hooks';
import {
  endGroup,
  error,
  getBooleanInput,
  getInput,
  info,
  setFailed,
  setOutput,
  startGroup,
  summary,
} from '@actions/core';
import { context } from '@actions/github';
import { getCheckRuns } from './getCheckRuns';
import { getMergeMethod } from './getMergeMethod';
import { getOctokit } from './getOcktokit';
import { getPullRequest } from './getPullRequest';
import { getPullRequestComments } from './getPullRequestComments';
import { getPullRequestReviewRequests } from './getPullRequestReviewRequests';
import { getPullRequestReviews } from './getPullRequestReviews';
import { getWorkflowRunJobs } from './getWorkflowRunJobs';
import { checkIfPullRequestMerged, mergePullRequest } from './mergePullRequest';
import { sleep } from './sleep';

const APPROVED = 'APPROVED';
const CHANGES_REQUESTED = 'CHANGES_REQUESTED';
const COMPLETED = 'completed';
const SUCCESS = 'success';
const NEUTRAL = 'neutral';
const SKIPPED = 'skipped';

const LOCALE = Intl.NumberFormat().resolvedOptions().locale;
const FORMATTER = new Intl.NumberFormat(LOCALE, {
  style: 'unit',
  unit: 'second',
  unitDisplay: 'long',
});

async function handlePullRequest(pullRequestNumber: number) {
  startGroup(`Pull Request number: ${pullRequestNumber}`);
  const githubToken = getInput('github-token');
  const octokit = getOctokit(githubToken);
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const mergedBeforeValidations = await checkIfPullRequestMerged(
    owner,
    repo,
    pullRequestNumber,
    octokit,
  );
  if (mergedBeforeValidations) {
    error(`This Pull Request has been merged already.`);
    return;
  }

  const customHashTag = getInput('custom-hashtag') || '#accept2ship';
  const hashTagLabel = customHashTag.replace(/^#*/, '');
  const hashTag = `#${hashTagLabel}`;

  const pullRequest = await getPullRequest(
    owner,
    repo,
    pullRequestNumber,
    octokit,
  );
  const accept2shipTitle = pullRequest.title?.toLowerCase()?.includes(hashTag);
  info(`${hashTag} ${accept2shipTitle ? '' : 'not '}found in title`);
  const accept2shipBody = pullRequest.body?.toLowerCase()?.includes(hashTag);
  info(`${hashTag} ${accept2shipBody ? '' : 'not '}found in body`);
  const accept2shipLabel = pullRequest.labels.some(
    (label) => label.name.toLowerCase() === hashTagLabel,
  );
  info(`${hashTag} ${accept2shipLabel ? '' : 'not '}found in labels`);

  const pullRequestUserId = pullRequest.user.id;
  const comments = await getPullRequestComments(
    owner,
    repo,
    pullRequestNumber,
    octokit,
  );
  const accept2shipComment = comments.some(
    (comment) =>
      comment.user?.id === pullRequestUserId &&
      comment.body.toLowerCase().includes(hashTag),
  );
  info(`${hashTag} ${accept2shipComment ? '' : 'not '}found in comments`);

  const accept2shipTag =
    accept2shipTitle ||
    accept2shipBody ||
    accept2shipLabel ||
    accept2shipComment;

  if (!accept2shipTag) {
    return;
  }

  const acceptZeroApprovals = getBooleanInput('request-zero-accept-zero');
  const reviewRequests = await getPullRequestReviewRequests(
    owner,
    repo,
    pullRequestNumber,
    octokit,
  );
  if (reviewRequests.users.length > 0) {
    info(
      `Review requested from users: ${reviewRequests.users
        .map((user) => `${user.login} (${user.html_url})`)
        .join()}`,
    );
  }
  if (reviewRequests.teams.length > 0) {
    info(
      `Review requested from teams: ${reviewRequests.teams
        .map((team) => team.name)
        .join()}`,
    );
  }
  if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
    info(`Review not requested.`);
  } else if (acceptZeroApprovals) {
    error(
      '`request-zero-accept-zero: true` has no effect when a reviewer is assigned.',
    );
  }

  const reviews = await getPullRequestReviews(
    owner,
    repo,
    pullRequestNumber,
    octokit,
  );

  let approved = false;
  const reviewsSortedByDescendingTime = reviews.sort(
    (x, y) =>
      Date.parse(y.submitted_at ?? '') - Date.parse(x.submitted_at ?? ''),
  );
  if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
    if (acceptZeroApprovals) {
      approved = reviews.every((review) => review.state !== CHANGES_REQUESTED);
      info(`Review states: ${reviews.length || 'none'}`);
      for (const review of reviews) {
        info(`  ${review.user?.login ?? 'Unknown'}: ${review.state}`);
      }
    } else {
      const lastReview = reviewsSortedByDescendingTime[0];
      info(`Last review state: ${lastReview?.state ?? 'none'}`);
      approved = lastReview?.state === APPROVED;
    }
  } else {
    const reviewUserIds = reviewRequests.users.map((user) => user.id);
    const lastReviewPerUserId = reviewsSortedByDescendingTime.reduce(
      (result, review) => {
        const user = review.user;
        if (user) {
          result[user.id] = result[user.id] ?? review;
        }
        return result;
      },
      {} as {
        [id: string]: components['schemas']['pull-request-review'];
      },
    );
    info(`Last review by user:`);
    for (const user of reviewRequests.users) {
      info(
        `  ${user.login}: ${lastReviewPerUserId[user.id]?.state ?? 'none'} ${
          user.id in lastReviewPerUserId
            ? `(${lastReviewPerUserId[user.id]?.html_url})`
            : ''
        }`,
      );
    }
    approved = reviewUserIds
      .map((userId) => lastReviewPerUserId[userId])
      .every((review) => review?.state === APPROVED);
  }

  if (!approved) {
    return;
  }
  endGroup();

  const jobs = await getWorkflowRunJobs(owner, repo, octokit);
  info(`Current workflow name: ${context.workflow}`);
  info(`Current run id: ${context.runId}`);
  info(`Current run number: ${context.runNumber}`);
  info(
    `Current run attempt: ${parseInt(process.env.GITHUB_RUN_ATTEMPT as string, 10)}`,
  ); // context.runAttempt in the future release of @actions/github
  info(`Current job static id: ${context.job}`);
  info(`Current step static id: ${context.action}`);
  info(`Jobs in current Workflow: ${jobs.length}`);
  for (const job of jobs) {
    info(`  Job id: ${job.id} (${job.html_url})`);
    info(`  Job name: ${job.name}`);
    if (job.steps !== undefined) {
      startGroup(`  Job steps: ${job.steps.length}`);
      for (const step of job.steps) {
        info(`    Step number: ${step.number}`);
        info(`    Step name: ${step.name}`);
        info(
          `    Step status/conclusion: ${
            step.status === COMPLETED ? step.conclusion : step.status
          }`,
        );
        info('    ---');
      }
      endGroup();
    }
  }
  const jobIds = jobs.map((job) => job.id);

  const timeout = parseInt(getInput('timeout'), 10);
  const interval = parseInt(getInput('checks-watch-interval'), 10);
  const failIfTimeout = getBooleanInput('fail-if-timeout');
  let worthChecking = true;
  let externalIds: Array<string | null> | undefined = undefined;
  while (worthChecking) {
    const checkRuns = await getCheckRuns(
      owner,
      repo,
      pullRequest.head.sha,
      octokit,
    );

    if (externalIds === undefined) {
      // Two instances of the same job's execution share the same external id but not the same job id.
      // We use external id to identify other instances of the job.
      externalIds = checkRuns
        .filter((checkRun) => {
          if (checkRun.external_id === null) {
            return false;
          }
          if (jobIds.includes(checkRun.id)) {
            info(
              `External ID associated with a job in current Workflow: ${checkRun.external_id} (job id: ${checkRun.id})`,
            );
            return true;
          }
          return false;
        })
        .map((checkRun) => checkRun.external_id);
    }

    info(`Checks:`);
    for (const checkRun of checkRuns) {
      info(`  Check id: ${checkRun.id} (${checkRun.html_url})`);
      info(`  Check name: ${checkRun.name}`);
      if (jobIds.includes(checkRun.id)) {
        info(
          `  Check status/conclusion: ${checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status}`,
        );
        info('  This check is a job in the current Workflow.');
        info('  ---');
      } else if (externalIds?.includes(checkRun.external_id)) {
        info(
          `  Check status/conclusion: ${checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status}`,
        );
        info('  This check is a job in another instance of the same Workflow.');
        info('  ---');
      } else if (checkRun.status === COMPLETED) {
        if (
          checkRun.conclusion !== null &&
          [SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)
        ) {
          info(`  Check status/conclusion: ${checkRun.conclusion}`);
          info('  ---');
        } else {
          info(`  Check status/conclusion: ${checkRun.conclusion}`);
          info('  ---');
        }
      } else {
        info(`  Check status/conclusion: ${checkRun.status}`);
        info('  ---');
      }
    }

    const failedChecks = checkRuns.filter(
      (checkRun) =>
        !jobIds.includes(checkRun.id) &&
        !externalIds?.includes(checkRun.external_id) &&
        checkRun.status === COMPLETED &&
        (checkRun.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)),
    );
    if (failedChecks.length > 0) {
      error(`Failed checks: ${failedChecks.length}`);
      return;
    }

    const incompleteChecks = checkRuns.filter(
      (checkRun) =>
        !jobIds.includes(checkRun.id) &&
        !externalIds?.includes(checkRun.external_id) &&
        checkRun.status !== COMPLETED,
    );
    if (incompleteChecks.length > 0) {
      info(`Incomplete checks: ${incompleteChecks.length}`);
      const executionTime = Math.round(performance.now() / 1000);
      info(`Execution time: ${FORMATTER.format(executionTime)}`);

      if (executionTime > timeout) {
        if (failIfTimeout) {
          setFailed(
            `Timeout: ${FORMATTER.format(executionTime)} > ${FORMATTER.format(
              timeout,
            )}`,
          );
        }
        return;
      }

      info(`Sleeping: ${FORMATTER.format(interval)}`);
      info('---');
      await sleep(interval * 1000);
    } else {
      worthChecking = false;
    }
  }

  const mergedAfterValidations = await checkIfPullRequestMerged(
    owner,
    repo,
    pullRequestNumber,
    octokit,
  );
  if (mergedAfterValidations) {
    error(`This Pull Request has been merged already.`);
    return;
  }

  const mergeMethod = getMergeMethod();
  info(`Merging with merge method: ${mergeMethod}`);
  await mergePullRequest(owner, repo, pullRequestNumber, mergeMethod, octokit);
  summary.addRaw(`Pull Request #${pullRequestNumber} has been merged.`, true);
}

async function run(): Promise<void> {
  info(`Event name: ${context.eventName}`);
  setOutput('skipped', true);
  switch (context.eventName) {
    case 'pull_request':
      await (async () => {
        const pullRequest = (context.payload as PullRequestEvent).pull_request;
        await handlePullRequest(pullRequest.number);
      })();
      break;
    case 'pull_request_review':
      await (async () => {
        const pullRequest = (context.payload as PullRequestReviewEvent)
          .pull_request;
        await handlePullRequest(pullRequest.number);
      })();
      break;
    case 'issue_comment':
      await (async () => {
        const issue = (context.payload as IssueCommentEvent).issue;
        if (issue.pull_request !== undefined) {
          await handlePullRequest(issue.number);
        }
      })();
      break;
    case 'check_run':
      await (async () => {
        const checkRun = (context.payload as CheckRunEvent).check_run;
        if (
          checkRun.status !== COMPLETED ||
          checkRun.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)
        ) {
          return;
        }
        for (const pullRequest of checkRun.pull_requests) {
          await handlePullRequest(pullRequest.number);
        }
      })();
      break;
    case 'check_suite':
      await (async () => {
        const checkSuites = (context.payload as CheckSuiteEvent).check_suite;
        if (
          checkSuites.status !== COMPLETED ||
          checkSuites.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(checkSuites.conclusion)
        ) {
          return;
        }
        for (const pullRequest of checkSuites.pull_requests) {
          await handlePullRequest(pullRequest.number);
        }
      })();
      break;
    case 'workflow_run':
      await (async () => {
        const workflowRun = (context.payload as WorkflowRunEvent).workflow_run;
        if (
          workflowRun.status !== COMPLETED ||
          workflowRun.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(workflowRun.conclusion)
        ) {
          return;
        }
        for (const pullRequest of workflowRun.pull_requests) {
          await handlePullRequest(pullRequest.number);
        }
      })();
      break;
    case 'workflow_dispatch':
    default:
      error(`Unsupported GitHub Action event: ${context.eventName}`);
      break;
  }
}

run().catch((error: Error) => setFailed(error));
