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
const getPullRequestReviewRequests_1 = require("./getPullRequestReviewRequests");
const getPullRequestReviews_1 = require("./getPullRequestReviews");
const getCheckRuns_1 = require("./getCheckRuns");
const mergePullRequest_1 = require("./mergePullRequest");
const sleep_1 = require("./sleep");
const APPROVED = "APPROVED";
const COMPLETED = "completed";
const SUCCESS = "success";
const NEUTRAL = "neutral";
const SKIPPED = "skipped";
const SLEEP_INTERVAL = 10 * 1000; // 10 seconds
function run() {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        if (github_1.context.eventName !== "pull_request") {
            (0, core_1.info)(JSON.stringify(github_1.context));
            (0, core_1.setFailed)("This action is for pull_request event only.");
        }
        const octokit = (0, getOcktokit_1.getOctokit)();
        const owner = github_1.context.repo.owner;
        const repo = github_1.context.repo.repo;
        const pullRequestNumber = github_1.context.payload.pull_request
            .number;
        const pullRequest = yield (0, getPullRequest_1.getPullRequest)(owner, repo, pullRequestNumber, octokit);
        const accept2shipTitle = (_b = (_a = pullRequest.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("#accept2ship");
        (0, core_1.info)(`#accept2ship ${accept2shipTitle ? "" : "not "}found in title`);
        const accept2shipBody = (_d = (_c = pullRequest.body) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === null || _d === void 0 ? void 0 : _d.includes("#accept2ship");
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
        if (!accept2shipTag) {
            return;
        }
        const reviewRequests = yield (0, getPullRequestReviewRequests_1.getPullRequestReviewRequests)(owner, repo, pullRequestNumber, octokit);
        if (reviewRequests.users.length > 0) {
            (0, core_1.info)(`Review requested from users: ${reviewRequests.users
                .map((user) => user.name)
                .join()}`);
        }
        if (reviewRequests.teams.length > 0) {
            (0, core_1.info)(`Review requested from teams: ${reviewRequests.teams
                .map((team) => team.name)
                .join()}`);
        }
        if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
            (0, core_1.info)(`Review not requested.`);
        }
        const reviews = yield (0, getPullRequestReviews_1.getPullRequestReviews)(owner, repo, pullRequestNumber, octokit);
        let approved = false;
        const reviewsSortedByDescendingTime = reviews.sort((x, y) => { var _a, _b; return Date.parse((_a = y.submitted_at) !== null && _a !== void 0 ? _a : "") - Date.parse((_b = x.submitted_at) !== null && _b !== void 0 ? _b : ""); });
        if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
            const lastReview = (_f = (_e = reviewsSortedByDescendingTime[0]) === null || _e === void 0 ? void 0 : _e.state) !== null && _f !== void 0 ? _f : "";
            (0, core_1.info)(`Last review state: ${lastReview}`);
            approved = lastReview === APPROVED;
        }
        else {
            const reviewUserIds = reviewRequests.users.map((user) => user.id);
            const lastReviewPerUserId = reviewsSortedByDescendingTime.reduce((result, review) => {
                var _a;
                const user = review.user;
                if (user) {
                    result[user.id] = (_a = result[user.id]) !== null && _a !== void 0 ? _a : review.state;
                }
                return result;
            }, {});
            (0, core_1.info)(`Last review by user:`);
            for (const user of reviewRequests.users) {
                (0, core_1.info)(`  ${user.name}: ${lastReviewPerUserId[user.id]}`);
            }
            approved = reviewUserIds
                .map((userId) => lastReviewPerUserId[userId])
                .every((state) => state === APPROVED);
        }
        if (!approved) {
            return;
        }
        while (true) {
            const checkRuns = yield (0, getCheckRuns_1.getCheckRuns)(owner, repo, pullRequest.head.sha, octokit);
            (0, core_1.info)(`Checks:`);
            for (const checkRun of checkRuns) {
                (0, core_1.info)(`  ${checkRun.name}: ${checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status}`);
            }
            const checksCompleted = checkRuns.every((checkRun) => checkRun.status === COMPLETED);
            if (checksCompleted) {
                const checksPassed = checkRuns.every((checkRun) => checkRun.status === COMPLETED &&
                    checkRun.conclusion !== null &&
                    [SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion));
                if (!checksPassed) {
                    return;
                }
                else {
                    break;
                }
            }
            else {
                (0, core_1.info)(`Sleeping: ${SLEEP_INTERVAL}`);
                yield (0, sleep_1.sleep)(SLEEP_INTERVAL);
            }
        }
        yield (0, mergePullRequest_1.mergePullRequest)(owner, repo, pullRequestNumber, octokit);
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
