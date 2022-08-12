import { context } from "@actions/github";
import { info, error, setFailed } from "@actions/core";
import { PullRequest } from "@octokit/webhooks-definitions/schema";
import { getOctokit } from "./getOcktokit";
import { getPullRequest } from "./getPullRequest";
import { getPullRequestComments } from "./getPullRequestComments";

async function run(): Promise<void> {
  if (context.eventName !== "pull_request") {
    setFailed("This action is for pull_request event only.");
  }
  info(`This is the Action context: ${JSON.stringify(context)}`);
  const octokit = getOctokit();
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pullRequestNumber = (context.payload.pull_request as PullRequest)
    .number;
  const pullRequest = await getPullRequest(
    owner,
    repo,
    pullRequestNumber,
    octokit
  );
  const accept2shipTitle = pullRequest.title
    .toLowerCase()
    .includes("#accept2ship");
  info(`#accept2ship ${accept2shipTitle ? "" : "not "}found in title`);
  const accept2shipBody = pullRequest.body
    .toLowerCase()
    .includes("#accept2ship");
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

  error("Action needs to be implemented.");
}

async function cleanup(): Promise<void> {
  error("Post action needs to be implemented or removed.");
}

if (!process.env["STATE_isPost"]) {
  run();
} else {
  cleanup();
}
