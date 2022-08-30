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
const getWorkflowRunJobs_1 = require("./getWorkflowRunJobs");
const getCheckRuns_1 = require("./getCheckRuns");
const mergePullRequest_1 = require("./mergePullRequest");
const sleep_1 = require("./sleep");
const node_perf_hooks_1 = require("node:perf_hooks");
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
function handePullRequest(pullRequestNumber) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = (0, getOcktokit_1.getOctokit)();
        const owner = github_1.context.repo.owner;
        const repo = github_1.context.repo.repo;
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
        const acceptZeroApprovals = (0, core_1.getBooleanInput)("request-zero-accept-zero");
        let approved = false;
        const reviewsSortedByDescendingTime = reviews.sort((x, y) => { var _a, _b; return Date.parse((_a = y.submitted_at) !== null && _a !== void 0 ? _a : "") - Date.parse((_b = x.submitted_at) !== null && _b !== void 0 ? _b : ""); });
        if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
            if (acceptZeroApprovals) {
                approved = reviews.every((review) => review.state !== CHANGES_REQUESTED);
            }
            else {
                const lastReview = reviewsSortedByDescendingTime[0];
                (0, core_1.info)(`Last review state: ${(_e = lastReview === null || lastReview === void 0 ? void 0 : lastReview.state) !== null && _e !== void 0 ? _e : "none"}`);
                approved = (lastReview === null || lastReview === void 0 ? void 0 : lastReview.state) === APPROVED;
            }
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
        const jobs = yield (0, getWorkflowRunJobs_1.getWorkflowRunJobs)(owner, repo, octokit);
        (0, core_1.info)(`Jobs: ${jobs.length}`);
        for (const job of jobs) {
            (0, core_1.info)(`  Job id: ${job.id} (${job.html_url})`);
            (0, core_1.info)(`  Job name: ${job.name}`);
            (0, core_1.info)(`  Job run id/attempt: ${job.run_id}-${job.run_attempt}\n\n`);
            if (job.steps !== undefined) {
                (0, core_1.info)(`  Job steps: ${job.steps.length}`);
                for (const step of job.steps) {
                    (0, core_1.info)(`    Step number: ${step.number}`);
                    (0, core_1.info)(`    Step name: ${step.name}`);
                    (0, core_1.info)(`    Step status/conclusion: ${step.status === COMPLETED ? step.conclusion : step.status}\n`);
                }
            }
        }
        const jobIds = jobs.map((job) => job.id);
        const timeout = parseInt((0, core_1.getInput)("timeout"), 10);
        const interval = parseInt((0, core_1.getInput)("checks-watch-interval"), 10);
        const failIfTimeout = (0, core_1.getBooleanInput)("fail-if-timeout");
        let worthChecking = true;
        let externalId = undefined;
        while (worthChecking) {
            const checkRuns = yield (0, getCheckRuns_1.getCheckRuns)(owner, repo, pullRequest.head.sha, octokit);
            (0, core_1.info)(`Checks:`);
            for (const checkRun of checkRuns) {
                (0, core_1.info)(`  Check id: ${checkRun.id} (${checkRun.html_url})`);
                (0, core_1.info)(`  Check name: ${checkRun.name}`);
                (0, core_1.info)(`  Check status/conclusion: ${checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status}\n\n`);
            }
            const failedCheckes = checkRuns.filter((checkRun) => checkRun.status === COMPLETED &&
                (checkRun.conclusion === null ||
                    ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)));
            if (failedCheckes.length > 0) {
                (0, core_1.info)(`Failed checks: ${failedCheckes.length}`);
                return;
            }
            if (externalId === undefined || externalId === null) {
                externalId = (_j = checkRuns.find((checkRun) => jobIds.includes(checkRun.id))) === null || _j === void 0 ? void 0 : _j.external_id;
            }
            const incompleteChecks = checkRuns.filter((checkRun) => !jobIds.includes(checkRun.id) &&
                checkRun.external_id !== externalId &&
                checkRun.status !== COMPLETED);
            if (incompleteChecks.length > 0) {
                (0, core_1.info)(`Incomplete checks: ${incompleteChecks.length}`);
                const executionTime = Math.round(node_perf_hooks_1.performance.now() / 1000);
                (0, core_1.info)(`Execution time: ${FORMATTER.format(executionTime)}`);
                if (executionTime > timeout) {
                    if (failIfTimeout) {
                        (0, core_1.setFailed)(`Timeout: ${FORMATTER.format(executionTime)} > ${FORMATTER.format(timeout)}`);
                    }
                    return;
                }
                (0, core_1.info)(`Sleeping: ${FORMATTER.format(interval)}\n`);
                yield (0, sleep_1.sleep)(interval * 1000);
            }
            else {
                worthChecking = false;
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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        switch (github_1.context.eventName) {
            case "pull_request":
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const pullRequest = github_1.context.payload.pull_request;
                    yield handePullRequest(pullRequest.number);
                }))();
                break;
            case "pull_request_review":
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const pullRequest = github_1.context.payload
                        .pull_request;
                    yield handePullRequest(pullRequest.number);
                }))();
                break;
            case "check_run":
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const checkRun = github_1.context.payload.check_run;
                    if (checkRun.status !== COMPLETED ||
                        checkRun.conclusion === null ||
                        ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)) {
                        return;
                    }
                    yield Promise.all(checkRun.pull_requests.map((pullRequest) => handePullRequest(pullRequest.number)));
                }))();
                return;
            case "check_suite":
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const checkSuites = github_1.context.payload.check_suite;
                    if (checkSuites.status !== COMPLETED ||
                        checkSuites.conclusion === null ||
                        ![SUCCESS, NEUTRAL, SKIPPED].includes(checkSuites.conclusion)) {
                        return;
                    }
                    yield Promise.all(checkSuites.pull_requests.map((pullRequest) => handePullRequest(pullRequest.number)));
                }))();
                return;
            case "workflow_run":
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const workflowRun = github_1.context.payload.workflow_run;
                    if (workflowRun.status !== COMPLETED ||
                        workflowRun.conclusion === null ||
                        ![SUCCESS, NEUTRAL, SKIPPED].includes(workflowRun.conclusion)) {
                        return;
                    }
                    switch (workflowRun.event) {
                        case "pull_request":
                        case "push":
                            yield Promise.all(workflowRun.pull_requests.map((pullRequest) => handePullRequest(pullRequest.number)));
                            return;
                        default:
                            (0, core_1.error)(`Unimplemented GitHub Action event: ${github_1.context.eventName}/${workflowRun.event}`);
                            return;
                    }
                }))();
                break;
            case "workflow_dispatch":
            default:
                (0, core_1.error)(`Unsupported GitHub Action event: ${github_1.context.eventName}`);
                return;
        }
    });
}
run();
