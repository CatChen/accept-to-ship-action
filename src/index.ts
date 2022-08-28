import { context } from "@actions/github";
import { info, error, setFailed, getInput } from "@actions/core";
import { PullRequest } from "@octokit/webhooks-definitions/schema";
import { getOctokit } from "./getOcktokit";
import { getMergeMethod } from "./getMergeMethod";
import { getPullRequest } from "./getPullRequest";
import { getPullRequestComments } from "./getPullRequestComments";
import { getPullRequestReviewRequests } from "./getPullRequestReviewRequests";
import { getPullRequestReviews } from "./getPullRequestReviews";
import { getCheckRuns } from "./getCheckRuns";
import { checkIfPullRequestMerged, mergePullRequest } from "./mergePullRequest";
import { sleep } from "./sleep";
import { components } from "@octokit/openapi-types/types";
import { performance } from "node:perf_hooks";

const APPROVED = "APPROVED";
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

async function run(): Promise<void> {
  const octokit = getOctokit();
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pullRequestNumber = (context.payload.pull_request as PullRequest)
    .number;

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

  let approved = false;
  const reviewsSortedByDescendingTime = reviews.sort(
    (x, y) =>
      Date.parse(y.submitted_at ?? "") - Date.parse(x.submitted_at ?? "")
  );
  if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
    const lastReview = reviewsSortedByDescendingTime[0];
    info(`Last review state: ${lastReview?.state ?? "none"}`);
    approved = lastReview?.state === APPROVED;
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
        `  ${user.login}: ${lastReviewPerUserId[user.id].state ?? "none"} (${
          lastReviewPerUserId[user.id].html_url
        })`
      );
    }
    approved = reviewUserIds
      .map((userId) => lastReviewPerUserId[userId])
      .every((review) => review.state === APPROVED);
  }

  if (!approved) {
    return;
  }

  const job = context.job;
  const timeout = parseInt(getInput("timeout"), 10);
  const interval = parseInt(getInput("checks-watch-interval"), 10);
  info(`Current job: ${job}`);
  let checksCompleted = false;
  while (!checksCompleted) {
    const checkRuns = await getCheckRuns(
      owner,
      repo,
      pullRequest.head.sha,
      octokit
    );
    info(`Checks:`);
    for (const checkRun of checkRuns) {
      info(
        `  ${checkRun.name}: ${
          checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status
        }`
      );
    }
    const incompleteChecks = checkRuns.filter(
      (checkRun) => checkRun.status !== COMPLETED
    );
    checksCompleted = incompleteChecks.length <= 1;
    if (checksCompleted) {
      const failedCheckes = checkRuns.filter(
        (checkRun) =>
          checkRun.status === COMPLETED &&
          (checkRun.conclusion === null ||
            ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion))
      );

      if (failedCheckes.length === 0) {
        break;
      } else {
        info(`Failed checks: ${failedCheckes.length}`);
        return;
      }
    } else {
      info(`Incomplete checks: ${incompleteChecks.length}`);
      const executionTime = Math.round(performance.now() / 1000);
      if (executionTime <= timeout) {
        info(`Execution time: ${FORMATTER.format(executionTime)}`);
        info(`Sleeping: ${FORMATTER.format(interval)}`);
        await sleep(interval * 1000);
      } else {
        error(`Execution time: ${FORMATTER.format(executionTime)}`);
        setFailed(
          `Timeout: ${FORMATTER.format(executionTime)} > ${FORMATTER.format(
            timeout
          )}`
        );
        return;
      }
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

run();
