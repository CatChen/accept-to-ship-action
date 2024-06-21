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
exports.checkIfPullRequestMerged = checkIfPullRequestMerged;
exports.mergePullRequest = mergePullRequest;
const console_1 = require("console");
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const request_error_1 = require("@octokit/request-error");
function checkIfPullRequestMerged(owner, repo, pullRequestNumber, octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { status } = yield octokit.rest.pulls.checkIfMerged({
                owner,
                repo,
                pull_number: pullRequestNumber,
            });
            if (status === 204) {
                return true;
            }
            else {
                return false;
            }
        }
        catch (requestError) {
            if (requestError instanceof request_error_1.RequestError) {
                if (requestError.status === 204) {
                    return true;
                }
                else if (requestError.status === 404) {
                    return false;
                }
                else {
                    throw new Error(`Failed to check if pull request is merged: [${requestError.status}] ${requestError.message}`);
                }
            }
            else {
                throw requestError;
            }
        }
    });
}
function mergePullRequest(owner, repo, pullRequestNumber, mergeMethod, octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            yield octokit.rest.pulls.merge({
                owner,
                repo,
                pull_number: pullRequestNumber,
                merge_method: mergeMethod,
            });
            (0, core_1.setOutput)('skipped', false);
            try {
                (0, console_1.info)(`Run ID: ${github_1.context.runId}`);
                const { data: job } = yield octokit.rest.actions.getWorkflowRun({
                    owner,
                    repo,
                    run_id: github_1.context.runId,
                });
                (0, console_1.info)(`Job ID: ${job.id} (${job.html_url})`);
                const { data: comment } = yield octokit.rest.issues.createComment({
                    owner,
                    repo,
                    issue_number: pullRequestNumber,
                    body: `This Pull Request is closed by a [GitHub Action](${job.html_url})`,
                });
                (0, console_1.info)(`Comment is created: ${comment.html_url}`);
            }
            catch (requestError) {
                if (requestError instanceof request_error_1.RequestError) {
                    (0, console_1.info)(`Failed to comment on the Pull Request: [${requestError.status}] ${requestError.message}`);
                }
            }
        }
        catch (requestError) {
            if (requestError instanceof request_error_1.RequestError) {
                (0, core_1.warning)(`Failed to merge the Pull Request: [${requestError.status}] ${requestError.message}`);
                // If it's merged by someone else in a race condition we treat it as skipped,
                // because it's the same as someone else merged it before we try.
                const merged = yield checkIfPullRequestMerged(owner, repo, pullRequestNumber, octokit);
                if (merged) {
                    try {
                        const { data: pullRequest } = yield octokit.rest.pulls.get({
                            owner,
                            repo,
                            pull_number: pullRequestNumber,
                        });
                        (0, core_1.warning)(`This Pull Request has been merged by: ${(_a = pullRequest.merged_by) === null || _a === void 0 ? void 0 : _a.login} (${(_b = pullRequest.merged_by) === null || _b === void 0 ? void 0 : _b.html_url})`);
                    }
                    catch (_c) {
                        (0, core_1.warning)(`This Pull Request has been merged by unknown user.`);
                    }
                }
                else {
                    // If it's not merged by someone else in a race condition then we treat it as a real error.
                    (0, core_1.error)(`This Pull Request remains unmerged.`);
                    (0, core_1.setFailed)(`Failed to merge this Pull Request when conditions are met.`);
                }
                (0, core_1.setOutput)('skipped', !merged);
            }
            else {
                throw requestError;
            }
        }
    });
}
