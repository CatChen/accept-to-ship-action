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
const getMergeMethod_1 = require("./getMergeMethod");
const getPullRequest_1 = require("./getPullRequest");
const getPullRequestComments_1 = require("./getPullRequestComments");
const getPullRequestReviewRequests_1 = require("./getPullRequestReviewRequests");
const getPullRequestReviews_1 = require("./getPullRequestReviews");
const getCheckRuns_1 = require("./getCheckRuns");
const mergePullRequest_1 = require("./mergePullRequest");
const sleep_1 = require("./sleep");
const node_perf_hooks_1 = require("node:perf_hooks");
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
function run() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, getOcktokit_1.getOctokit)();
        const owner = github_1.context.repo.owner;
        const repo = github_1.context.repo.repo;
        const pullRequestNumber = github_1.context.payload.pull_request
            .number;
        const mergedBeforeValidations = yield (0, mergePullRequest_1.checkIfPullRequestMerged)(owner, repo, pullRequestNumber, octokit);
        if (mergedBeforeValidations) {
            (0, core_1.error)(`This Pull Request has been merged already.`);
            return;
        }
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
                .map((user) => `${user.login} (${user.html_url})`)
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
            const lastReview = reviewsSortedByDescendingTime[0];
            (0, core_1.info)(`Last review state: ${(_e = lastReview === null || lastReview === void 0 ? void 0 : lastReview.state) !== null && _e !== void 0 ? _e : "none"}`);
            approved = (lastReview === null || lastReview === void 0 ? void 0 : lastReview.state) === APPROVED;
        }
        else {
            const reviewUserIds = reviewRequests.users.map((user) => user.id);
            const lastReviewPerUserId = reviewsSortedByDescendingTime.reduce((result, review) => {
                var _a;
                const user = review.user;
                if (user) {
                    result[user.id] = (_a = result[user.id]) !== null && _a !== void 0 ? _a : review;
                }
                return result;
            }, {});
            (0, core_1.info)(`Last review by user:`);
            for (const user of reviewRequests.users) {
                (0, core_1.info)(`  ${user.login}: ${(_g = (_f = lastReviewPerUserId[user.id]) === null || _f === void 0 ? void 0 : _f.state) !== null && _g !== void 0 ? _g : "none"} ${user.id in lastReviewPerUserId
                    ? `(${(_h = lastReviewPerUserId[user.id]) === null || _h === void 0 ? void 0 : _h.html_url})`
                    : ""}`);
            }
            approved = reviewUserIds
                .map((userId) => lastReviewPerUserId[userId])
                .every((review) => (review === null || review === void 0 ? void 0 : review.state) === APPROVED);
        }
        if (!approved) {
            return;
        }
        const job = github_1.context.job;
        const timeout = parseInt((0, core_1.getInput)("timeout"), 10);
        const interval = parseInt((0, core_1.getInput)("checks-watch-interval"), 10);
        (0, core_1.info)(`Current job: ${job}`);
        let checksCompleted = false;
        while (!checksCompleted) {
            const checkRuns = yield (0, getCheckRuns_1.getCheckRuns)(owner, repo, pullRequest.head.sha, octokit);
            (0, core_1.info)(`Checks:`);
            for (const checkRun of checkRuns) {
                (0, core_1.info)(`  ${checkRun.name}: ${checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status}`);
            }
            const incompleteChecks = checkRuns.filter((checkRun) => checkRun.status !== COMPLETED);
            checksCompleted = incompleteChecks.length <= 1;
            if (checksCompleted) {
                const failedCheckes = checkRuns.filter((checkRun) => checkRun.status === COMPLETED &&
                    (checkRun.conclusion === null ||
                        ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)));
                if (failedCheckes.length === 0) {
                    break;
                }
                else {
                    (0, core_1.info)(`Failed checks: ${failedCheckes.length}`);
                    return;
                }
            }
            else {
                (0, core_1.info)(`Incomplete checks: ${incompleteChecks.length}`);
                const executionTime = Math.round(node_perf_hooks_1.performance.now() / 1000);
                if (executionTime <= timeout) {
                    (0, core_1.info)(`Execution time: ${FORMATTER.format(executionTime)}`);
                    (0, core_1.info)(`Sleeping: ${FORMATTER.format(interval)}`);
                    yield (0, sleep_1.sleep)(interval * 1000);
                }
                else {
                    (0, core_1.error)(`Execution time: ${FORMATTER.format(executionTime)}`);
                    (0, core_1.setFailed)(`Timeout: ${FORMATTER.format(executionTime)} > ${FORMATTER.format(timeout)}`);
                    return;
                }
            }
        }
        const mergedAfterValidations = yield (0, mergePullRequest_1.checkIfPullRequestMerged)(owner, repo, pullRequestNumber, octokit);
        if (mergedAfterValidations) {
            (0, core_1.error)(`This Pull Request has been merged already.`);
            return;
        }
        const mergeMethod = (0, getMergeMethod_1.getMergeMethod)();
        (0, core_1.info)(`Merging with merge method: ${mergeMethod}`);
        yield (0, mergePullRequest_1.mergePullRequest)(owner, repo, pullRequestNumber, mergeMethod, octokit);
    });
}
run();
