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
const node_perf_hooks_1 = require("node:perf_hooks");
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const getCheckRuns_1 = require("./getCheckRuns");
const getMergeMethod_1 = require("./getMergeMethod");
const getOcktokit_1 = require("./getOcktokit");
const getPullRequest_1 = require("./getPullRequest");
const getPullRequestComments_1 = require("./getPullRequestComments");
const getPullRequestReviewRequests_1 = require("./getPullRequestReviewRequests");
const getPullRequestReviews_1 = require("./getPullRequestReviews");
const getWorkflowRunJobs_1 = require("./getWorkflowRunJobs");
const mergePullRequest_1 = require("./mergePullRequest");
const sleep_1 = require("./sleep");
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
function handlePullRequest(pullRequestNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        (0, core_1.startGroup)(`Pull Request number: ${pullRequestNumber}`);
        const octokit = (0, getOcktokit_1.getOctokit)();
        const owner = github_1.context.repo.owner;
        const repo = github_1.context.repo.repo;
        const mergedBeforeValidations = yield (0, mergePullRequest_1.checkIfPullRequestMerged)(owner, repo, pullRequestNumber, octokit);
        if (mergedBeforeValidations) {
            (0, core_1.error)(`This Pull Request has been merged already.`);
            return;
        }
        const customHashTag = (0, core_1.getInput)('custom-hashtag') || '#accept2ship';
        const hashTagLabel = customHashTag.replace(/^#*/, '');
        const hashTag = `#${hashTagLabel}`;
        const pullRequest = yield (0, getPullRequest_1.getPullRequest)(owner, repo, pullRequestNumber, octokit);
        const accept2shipTitle = (_b = (_a = pullRequest.title) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes(hashTag);
        (0, core_1.info)(`${hashTag} ${accept2shipTitle ? '' : 'not '}found in title`);
        const accept2shipBody = (_d = (_c = pullRequest.body) === null || _c === void 0 ? void 0 : _c.toLowerCase()) === null || _d === void 0 ? void 0 : _d.includes(hashTag);
        (0, core_1.info)(`${hashTag} ${accept2shipBody ? '' : 'not '}found in body`);
        const accept2shipLabel = pullRequest.labels.some((label) => label.name.toLowerCase() === hashTagLabel);
        (0, core_1.info)(`${hashTag} ${accept2shipLabel ? '' : 'not '}found in labels`);
        const pullRequestUserId = pullRequest.user.id;
        const comments = yield (0, getPullRequestComments_1.getPullRequestComments)(owner, repo, pullRequestNumber, octokit);
        const accept2shipComment = comments.some((comment) => {
            var _a;
            return ((_a = comment.user) === null || _a === void 0 ? void 0 : _a.id) === pullRequestUserId &&
                comment.body.toLowerCase().includes(hashTag);
        });
        (0, core_1.info)(`${hashTag} ${accept2shipComment ? '' : 'not '}found in comments`);
        const accept2shipTag = accept2shipTitle ||
            accept2shipBody ||
            accept2shipLabel ||
            accept2shipComment;
        if (!accept2shipTag) {
            return;
        }
        const acceptZeroApprovals = (0, core_1.getBooleanInput)('request-zero-accept-zero');
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
        else if (acceptZeroApprovals) {
            (0, core_1.error)('`request-zero-accept-zero: true` has no effect when a reviewer is assigned.');
        }
        const reviews = yield (0, getPullRequestReviews_1.getPullRequestReviews)(owner, repo, pullRequestNumber, octokit);
        let approved = false;
        const reviewsSortedByDescendingTime = reviews.sort((x, y) => { var _a, _b; return Date.parse((_a = y.submitted_at) !== null && _a !== void 0 ? _a : '') - Date.parse((_b = x.submitted_at) !== null && _b !== void 0 ? _b : ''); });
        if (reviewRequests.users.length === 0 && reviewRequests.teams.length === 0) {
            if (acceptZeroApprovals) {
                approved = reviews.every((review) => review.state !== CHANGES_REQUESTED);
                (0, core_1.info)(`Review states: ${reviews.length || 'none'}`);
                for (const review of reviews) {
                    (0, core_1.info)(`  ${(_f = (_e = review.user) === null || _e === void 0 ? void 0 : _e.login) !== null && _f !== void 0 ? _f : 'Unknown'}: ${review.state}`);
                }
            }
            else {
                const lastReview = reviewsSortedByDescendingTime[0];
                (0, core_1.info)(`Last review state: ${(_g = lastReview === null || lastReview === void 0 ? void 0 : lastReview.state) !== null && _g !== void 0 ? _g : 'none'}`);
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
                (0, core_1.info)(`  ${user.login}: ${(_j = (_h = lastReviewPerUserId[user.id]) === null || _h === void 0 ? void 0 : _h.state) !== null && _j !== void 0 ? _j : 'none'} ${user.id in lastReviewPerUserId
                    ? `(${(_k = lastReviewPerUserId[user.id]) === null || _k === void 0 ? void 0 : _k.html_url})`
                    : ''}`);
            }
            approved = reviewUserIds
                .map((userId) => lastReviewPerUserId[userId])
                .every((review) => (review === null || review === void 0 ? void 0 : review.state) === APPROVED);
        }
        if (!approved) {
            return;
        }
        (0, core_1.endGroup)();
        const jobs = yield (0, getWorkflowRunJobs_1.getWorkflowRunJobs)(owner, repo, octokit);
        (0, core_1.info)(`Current workflow name: ${github_1.context.workflow}`);
        (0, core_1.info)(`Current run id: ${github_1.context.runId}`);
        (0, core_1.info)(`Current run number: ${github_1.context.runNumber}`);
        (0, core_1.info)(`Current run attempt: ${parseInt(process.env.GITHUB_RUN_ATTEMPT, 10)}`); // context.runAttempt in the future release of @actions/github
        (0, core_1.info)(`Current job static id: ${github_1.context.job}`);
        (0, core_1.info)(`Current step static id: ${github_1.context.action}`);
        (0, core_1.info)(`Jobs in current Workflow: ${jobs.length}`);
        for (const job of jobs) {
            (0, core_1.info)(`  Job id: ${job.id} (${job.html_url})`);
            (0, core_1.info)(`  Job name: ${job.name}`);
            if (job.steps !== undefined) {
                (0, core_1.startGroup)(`  Job steps: ${job.steps.length}`);
                for (const step of job.steps) {
                    (0, core_1.info)(`    Step number: ${step.number}`);
                    (0, core_1.info)(`    Step name: ${step.name}`);
                    (0, core_1.info)(`    Step status/conclusion: ${step.status === COMPLETED ? step.conclusion : step.status}`);
                    (0, core_1.info)('    ---');
                }
                (0, core_1.endGroup)();
            }
        }
        const jobIds = jobs.map((job) => job.id);
        const timeout = parseInt((0, core_1.getInput)('timeout'), 10);
        const interval = parseInt((0, core_1.getInput)('checks-watch-interval'), 10);
        const failIfTimeout = (0, core_1.getBooleanInput)('fail-if-timeout');
        let worthChecking = true;
        let externalIds = undefined;
        while (worthChecking) {
            const checkRuns = yield (0, getCheckRuns_1.getCheckRuns)(owner, repo, pullRequest.head.sha, octokit);
            if (externalIds === undefined) {
                // Two instances of the same job's execution share the same external id but not the same job id.
                // We use external id to identify other instances of the job.
                externalIds = checkRuns
                    .filter((checkRun) => {
                    if (checkRun.external_id === null) {
                        return false;
                    }
                    if (jobIds.includes(checkRun.id)) {
                        (0, core_1.info)(`External ID associated with a job in current Workflow: ${checkRun.external_id} (job id: ${checkRun.id})`);
                        return true;
                    }
                    return false;
                })
                    .map((checkRun) => checkRun.external_id);
            }
            (0, core_1.info)(`Checks:`);
            for (const checkRun of checkRuns) {
                (0, core_1.info)(`  Check id: ${checkRun.id} (${checkRun.html_url})`);
                (0, core_1.info)(`  Check name: ${checkRun.name}`);
                if (jobIds.includes(checkRun.id)) {
                    (0, core_1.info)(`  Check status/conclusion: ${checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status}`);
                    (0, core_1.info)('  This check is a job in the current Workflow.');
                    (0, core_1.info)('  ---');
                }
                else if (externalIds === null || externalIds === void 0 ? void 0 : externalIds.includes(checkRun.external_id)) {
                    (0, core_1.info)(`  Check status/conclusion: ${checkRun.status === COMPLETED ? checkRun.conclusion : checkRun.status}`);
                    (0, core_1.info)('  This check is a job in another instance of the same Workflow.');
                    (0, core_1.info)('  ---');
                }
                else if (checkRun.status === COMPLETED) {
                    if (checkRun.conclusion !== null &&
                        [SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)) {
                        (0, core_1.info)(`  Check status/conclusion: ${checkRun.conclusion}`);
                        (0, core_1.info)('  ---');
                    }
                    else {
                        (0, core_1.info)(`  Check status/conclusion: ${checkRun.conclusion}`);
                        (0, core_1.info)('  ---');
                    }
                }
                else {
                    (0, core_1.info)(`  Check status/conclusion: ${checkRun.status}`);
                    (0, core_1.info)('  ---');
                }
            }
            const failedChecks = checkRuns.filter((checkRun) => !jobIds.includes(checkRun.id) &&
                !(externalIds === null || externalIds === void 0 ? void 0 : externalIds.includes(checkRun.external_id)) &&
                checkRun.status === COMPLETED &&
                (checkRun.conclusion === null ||
                    ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)));
            if (failedChecks.length > 0) {
                (0, core_1.error)(`Failed checks: ${failedChecks.length}`);
                return;
            }
            const incompleteChecks = checkRuns.filter((checkRun) => !jobIds.includes(checkRun.id) &&
                !(externalIds === null || externalIds === void 0 ? void 0 : externalIds.includes(checkRun.external_id)) &&
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
                (0, core_1.info)(`Sleeping: ${FORMATTER.format(interval)}`);
                (0, core_1.info)('---');
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
        core_1.summary.addRaw(`Pull Request #${pullRequestNumber} has been merged.`, true);
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, core_1.info)(`Event name: ${github_1.context.eventName}`);
        (0, core_1.setOutput)('skipped', true);
        switch (github_1.context.eventName) {
            case 'pull_request':
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const pullRequest = github_1.context.payload.pull_request;
                    yield handlePullRequest(pullRequest.number);
                }))();
                break;
            case 'pull_request_review':
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const pullRequest = github_1.context.payload
                        .pull_request;
                    yield handlePullRequest(pullRequest.number);
                }))();
                break;
            case 'issue_comment':
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const issue = github_1.context.payload.issue;
                    if (issue.pull_request !== undefined) {
                        yield handlePullRequest(issue.number);
                    }
                }))();
                break;
            case 'check_run':
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const checkRun = github_1.context.payload.check_run;
                    if (checkRun.status !== COMPLETED ||
                        checkRun.conclusion === null ||
                        ![SUCCESS, NEUTRAL, SKIPPED].includes(checkRun.conclusion)) {
                        return;
                    }
                    for (const pullRequest of checkRun.pull_requests) {
                        yield handlePullRequest(pullRequest.number);
                    }
                }))();
                break;
            case 'check_suite':
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const checkSuites = github_1.context.payload.check_suite;
                    if (checkSuites.status !== COMPLETED ||
                        checkSuites.conclusion === null ||
                        ![SUCCESS, NEUTRAL, SKIPPED].includes(checkSuites.conclusion)) {
                        return;
                    }
                    for (const pullRequest of checkSuites.pull_requests) {
                        yield handlePullRequest(pullRequest.number);
                    }
                }))();
                break;
            case 'workflow_run':
                yield (() => __awaiter(this, void 0, void 0, function* () {
                    const workflowRun = github_1.context.payload.workflow_run;
                    if (workflowRun.status !== COMPLETED ||
                        workflowRun.conclusion === null ||
                        ![SUCCESS, NEUTRAL, SKIPPED].includes(workflowRun.conclusion)) {
                        return;
                    }
                    for (const pullRequest of workflowRun.pull_requests) {
                        yield handlePullRequest(pullRequest.number);
                    }
                }))();
                break;
            case 'workflow_dispatch':
            default:
                (0, core_1.error)(`Unsupported GitHub Action event: ${github_1.context.eventName}`);
                break;
        }
    });
}
run().catch((error) => (0, core_1.setFailed)(error));
