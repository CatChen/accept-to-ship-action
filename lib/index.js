"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const core_1 = require("@actions/core");
const getOcktokit_1 = require("./getOcktokit");
const getPullRequest_1 = require("./getPullRequest");
const getPullRequestComments_1 = require("./getPullRequestComments");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (github_1.context.eventName !== "pull_request") {
            (0, core_1.setFailed)("This action is for pull_request event only.");
        }
        const octokit = (0, getOcktokit_1.getOctokit)();
        const owner = github_1.context.repo.owner;
        const repo = github_1.context.repo.repo;
        const pullRequestNumber = github_1.context.payload.pull_request
            .number;
        const pullRequest = yield (0, getPullRequest_1.getPullRequest)(owner, repo, pullRequestNumber, octokit);
        (0, core_1.info)(`This is the Pull Request: ${JSON.stringify(pullRequest)}`);
        const accept2shipTitle = pullRequest.title
            .toLowerCase()
            .includes("#accept2ship");
        (0, core_1.info)(`#accept2ship ${accept2shipTitle ? "" : "not "}found in title`);
        const accept2shipBody = pullRequest.body
            .toLowerCase()
            .includes("#accept2ship");
        (0, core_1.info)(`#accept2ship ${accept2shipBody ? "" : "not "}found in body`);
        const accept2shipLabel = pullRequest.labels.some((label) => label.name.toLowerCase() === "accept2ship");
        (0, core_1.info)(`#accept2ship ${accept2shipLabel ? "" : "not "}found in labels`);
        const pullRequestUserId = pullRequest.user.id;
        const comments = yield (0, getPullRequestComments_1.getPullRequestComments)(owner, repo, pullRequestNumber, octokit);
        const accept2shipComment = comments.some((comment) => {
            var _a;
            return ((_a = comment.user) === null || _a === void 0 ? void 0 : _a.id) === pullRequestUserId &&
                comment.body.toLowerCase().includes("#accept2ship");
        });
        (0, core_1.info)(`#accept2ship ${accept2shipComment ? "" : "not "}found in comments`);
        const accept2shipTag = accept2shipTitle ||
            accept2shipBody ||
            accept2shipLabel ||
            accept2shipComment;
        (0, core_1.error)("Action needs to be implemented.");
    });
}
function cleanup() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, core_1.error)("Post action needs to be implemented or removed.");
    });
}
if (!process.env["STATE_isPost"]) {
    run();
}
else {
    cleanup();
}
