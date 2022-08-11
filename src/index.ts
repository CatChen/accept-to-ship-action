import { context } from "@actions/github";
import { info, error, setFailed } from "@actions/core";
import { PullRequest } from "@octokit/webhooks-definitions/schema";
import { getOctokit } from "./getOcktokit";
import { getPullRequest } from "./getPullRequest";

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
