import { context } from "@actions/github";
import {
  info,
  error,
  setFailed,
  getInput,
  getBooleanInput,
} from "@actions/core";
import {
  CheckRunEvent,
  CheckSuiteEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  WorkflowRunEvent,
} from "@octokit/webhooks-definitions/schema";
import { getOctokit } from "./getOcktokit";
import { getMergeMethod } from "./getMergeMethod";
import { getPullRequest } from "./getPullRequest";
import { getPullRequestComments } from "./getPullRequestComments";
import { getPullRequestReviewRequests } from "./getPullRequestReviewRequests";
import { getPullRequestReviews } from "./getPullRequestReviews";
import { getWorkflowRunJobs } from "./getWorkflowRunJobs";
import { getCheckRuns } from "./getCheckRuns";
import { updateCheckRun } from "./updateCheckRun";
import { checkIfPullRequestMerged, mergePullRequest } from "./mergePullRequest";
import { sleep } from "./sleep";
import { components } from "@octokit/openapi-types/types";
import { performance } from "node:perf_hooks";

const APPROVED = "APPROVED";
const CHANGES_REQUESTED = "CHANGES_REQUESTED";
const COMPLETED = "completed";
const SUCCESS = "success";
const NEUTRAL = "neutral";
const SKIPPED = "skipped";

const LOCALE = Intl.NumberFormat().resolvedOptions().locale;
const FORMATTER = new Intl.NumberFormat(LOCALE, {
  style: "unit",
  unit: "second",
  unitDisplay: "long",
});

async function handePullRequest(pullRequestNumber: number) {
  const octokit = getOctokit();
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const mergedBeforeValidations = await checkIfPullRequestMerged(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );
  if (mergedBeforeValidations) {
    error(`This Pull Request has been merged already.`);
    return;
  }

  const pullRequest = await getPullRequest(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );
  const accept2shipTitle = pullRequest.title
    ?.toLowerCase()
    ?.includes("#accept2ship");
  info(`#accept2ship ${accept2shipTitle ? "" : "not "}found in title`);
  const accept2shipBody = pullRequest.body
    ?.toLowerCase()
    ?.includes("#accept2ship");
  info(`#accept2ship ${accept2shipBody ? "" : "not "}found in body`);
  const accept2shipLabel = pullRequest.labels.some(
    (label) => label.name.toLowerCase() === "accept2ship"
  );
  info(`#accept2ship ${accept2shipLabel ? "" : "not "}found in labels`);

  const pullRequestUserId = pullRequest.user.id;
  const comments = await getPullRequestComments(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );
  const accept2shipComment = comments.some(
    (comment) =>
      comment.user?.id === pullRequestUserId &&
      comment.body.toLowerCase().includes("#accept2ship")
  );
  info(`#accept2ship ${accept2shipComment ? "" : "not "}found in comments`);

  const accept2shipTag =
    accept2shipTitle ||
    accept2shipBody ||
    accept2shipLabel ||
    accept2shipComment;

  if (!accept2shipTag) {
    return;
  }

  const reviewRequests = await getPullRequestReviewRequests(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );
  if (reviewRequests.users.length > 0) {
    info(
      `Review requested from users: ${reviewRequests.users
        .map((user) => `${user.login} (${user.html_url})`)
        .join()}`
    );
  }
  if (reviewRequests.teams.length > 0) {
    info(
      `Review requested from teams: ${reviewRequests.teams
        .map((team) => team.name)
        .join()}`
    );
  }
  if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
    info(`Review not requested.`);
  }

  const reviews = await getPullRequestReviews(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );

  const acceptZeroApprovals = getBooleanInput("request-zero-accept-zero");
  let approved = false;
  const reviewsSortedByDescendingTime = reviews.sort(
    (x, y) =>
      Date.parse(y.submitted_at ?? "") - Date.parse(x.submitted_at ?? "")
  );
  if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
    if (acceptZeroApprovals) {
      approved = reviews.every((review) => review.state !== CHANGES_REQUESTED);
    } else {
      const lastReview = reviewsSortedByDescendingTime[0];
      info(`Last review state: ${lastReview?.state ?? "none"}`);
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
        [id: string]: components["schemas"]["pull-request-review"];
      }
    );
    info(`Last review by user:`);
    for (const user of reviewRequests.users) {
      info(
        `  ${user.login}: ${lastReviewPerUserId[user.id]?.state ?? "none"} ${
          user.id in lastReviewPerUserId
            ? `(${lastReviewPerUserId[user.id]?.html_url})`
            : ""
        }`
      );
    }
    approved = reviewUserIds
      .map((userId) => lastReviewPerUserId[userId])
      .every((review) => review?.state === APPROVED);
  }

  if (!approved) {
    return;
  }

  const jobs = await getWorkflowRunJobs(owner, repo, octokit);
  info(`Jobs: ${jobs.length}`);
  for (const job of jobs) {
    info(`  Job id: ${job.id} (${job.html_url})`);
    info(`  Job name: ${job.name}`);
    info(`  Job run id/attempt: ${job.run_id}-${job.run_attempt}\n\n`);
    if (job.steps !== undefined) {
      info(`  Job steps: ${job.steps.length}`);
      for (const step of job.steps) {
        info(`    Step number: ${step.number}`);
        info(`    Step name: ${step.name}`);
        info(
          `    Step status/conclusion: ${
            step.status === COMPLETED ? step.conclusion : step.status
          }\n`
        );
      }
    }
  }
  const jobIds = jobs.map((job) => job.id);

  const timeout = parseInt(getInput("timeout"), 10);
  const interval = parseInt(getInput("checks-watch-interval"), 10);
  const failIfTimeout = getBooleanInput("fail-if-timeout");
  let worthChecking = true;
  let externalId: string | undefined | null = undefined;
  while (worthChecking) {
    const checkRuns = await getCheckRuns(
      owner,
      repo,
      pullRequest.head.sha,
      octokit
    );
    info(`Checks:`);
    for (const checkRun of checkRuns) {
      info(`  Check id: ${checkRun.id} (${checkRun.html_url})`);
      info(`  Check name: ${checkRun.name}`);
      info(
        `  Check status/conclusion: ${
          checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status
        }\n\n`
      );
    }

    const failedCheckes = checkRuns.filter(
      (checkRun) =>
        checkRun.status === COMPLETED &&
        (checkRun.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion))
    );
    if (failedCheckes.length > 0) {
      info(`Failed checks: ${failedCheckes.length}`);
      return;
    }

    if (externalId === undefined || externalId === null) {
      externalId = checkRuns.find((checkRun) =>
        jobIds.includes(checkRun.id)
      )?.external_id;
    }
    const incompleteChecks = checkRuns.filter(
      (checkRun) =>
        !jobIds.includes(checkRun.id) &&
        checkRun.external_id !== externalId &&
        checkRun.status !== COMPLETED
    );
    if (incompleteChecks.length > 0) {
      info(`Incomplete checks: ${incompleteChecks.length}`);
      const executionTime = Math.round(performance.now() / 1000);
      info(`Execution time: ${FORMATTER.format(executionTime)}`);

      if (executionTime > timeout) {
        if (failIfTimeout) {
          setFailed(
            `Timeout: ${FORMATTER.format(executionTime)} > ${FORMATTER.format(
              timeout
            )}`
          );
        }
        return;
      }

      info(`Sleeping: ${FORMATTER.format(interval)}\n`);
      await sleep(interval * 1000);
    } else {
      worthChecking = false;
    }
  }

  const mergedAfterValidations = await checkIfPullRequestMerged(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );
  if (mergedAfterValidations) {
    error(`This Pull Request has been merged already.`);
    return;
  }

  const mergeMethod = getMergeMethod();
  info(`Merging with merge method: ${mergeMethod}`);
  await mergePullRequest(owner, repo, pullRequestNumber, mergeMethod, octokit);
}

async function run(): Promise<void> {
  switch (context.eventName) {
    case "pull_request":
      await (async () => {
        const pullRequest = (context.payload as PullRequestEvent).pull_request;
        await handePullRequest(pullRequest.number);
      })();
      break;
    case "pull_request_review":
      await (async () => {
        const pullRequest = (context.payload as PullRequestReviewEvent)
          .pull_request;
        await handePullRequest(pullRequest.number);
      })();
      break;
    case "check_run":
      await (async () => {
        const checkRun = (context.payload as CheckRunEvent).check_run;
        if (
          checkRun.status !== COMPLETED ||
          checkRun.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)
        ) {
          return;
        }
        await Promise.all(
          checkRun.pull_requests.map((pullRequest) =>
            handePullRequest(pullRequest.number)
          )
        );
      })();
      return;
    case "check_suite":
      await (async () => {
        const checkSuites = (context.payload as CheckSuiteEvent).check_suite;
        if (
          checkSuites.status !== COMPLETED ||
          checkSuites.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(checkSuites.conclusion)
        ) {
          return;
        }
        await Promise.all(
          checkSuites.pull_requests.map((pullRequest) =>
            handePullRequest(pullRequest.number)
          )
        );
      })();
      return;
    case "workflow_run":
      await (async () => {
        const workflowRun = (context.payload as WorkflowRunEvent).workflow_run;
        if (
          workflowRun.status !== COMPLETED ||
          workflowRun.conclusion === null ||
          ![SUCCESS, NEUTRAL, SKIPPED].includes(workflowRun.conclusion)
        ) {
          return;
        }
        switch (workflowRun.event) {
          case "pull_request":
          case "push":
            await Promise.all(
              workflowRun.pull_requests.map((pullRequest) =>
                handePullRequest(pullRequest.number)
              )
            );
            return;
          default:
            error(
              `Unimplemented GitHub Action event: ${context.eventName}/${workflowRun.event}`
            );
            return;
        }
      })();
      break;
    case "workflow_dispatch":
    default:
      error(`Unsupported GitHub Action event: ${context.eventName}`);
      return;
  }
}

run();
