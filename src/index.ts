import { context } from "@actions/github";
import { info, error, setFailed, notice } from "@actions/core";
import { PullRequest } from "@octokit/webhooks-definitions/schema";
import { getOctokit } from "./getOcktokit";
import { getPullRequest } from "./getPullRequest";
import { getPullRequestComments } from "./getPullRequestComments";
import { getPullRequestReviewRequests } from "./getPullRequestReviewRequests";
import { getPullRequestReviews } from "./getPullRequestReviews";
import { getCheckRuns } from "./getCheckRuns";
import { checkIfPullRequestMerged, mergePullRequest } from "./mergePullRequest";
import { sleep } from "./sleep";
import { components } from "@octokit/openapi-types/types";

const APPROVED = "APPROVED";
const COMPLETED = "completed";
const SUCCESS = "success";
const NEUTRAL = "neutral";
const SKIPPED = "skipped";

const SLEEP_INTERVAL = 10 * 1000; // 10 seconds

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    setFailed("This action is for pull_request event only.");
  }
  const octokit = getOctokit();
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pullRequestNumber = (context.payload.pull_request as PullRequest)
    .number;

  const merged = await checkIfPullRequestMerged(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );
  if (merged) {
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
        .map((user) => user.name)
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
    const lastReview = reviewsSortedByDescendingTime[0]?.state ?? "";
    info(`Last review state: ${lastReview}`);
    approved = lastReview === APPROVED;
  } else {
    const reviewUserIds = reviewRequests.users.map((user) => user.id);
    const lastReviewPerUserId = reviewsSortedByDescendingTime.reduce(
      (result, review) => {
        const user = review.user;
        if (user) {
          result[user.id] = result[user.id] ?? review.state;
        }
        return result;
      },
      {} as {
        [id: string]: components["schemas"]["pull-request-review"]["state"];
      }
    );
    info(`Last review by user:`);
    for (const user of reviewRequests.users) {
      info(`  ${user.name}: ${lastReviewPerUserId[user.id]}`);
    }
    approved = reviewUserIds
      .map((userId) => lastReviewPerUserId[userId])
      .every((state) => state === APPROVED);
  }

  if (!approved) {
    return;
  }

  const job = context.job;
  notice(`Current job: ${job}`);
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
      info(`Sleeping: ${SLEEP_INTERVAL}`);
      await sleep(SLEEP_INTERVAL);
    }
  }

  await mergePullRequest(owner, repo, pullRequestNumber, octokit);
}

async function cleanup(): Promise<void> {
  error("Post action needs to be implemented or removed.");
}

if (!process.env["STATE_isPost"]) {
  run();
} else {
  cleanup();
}
