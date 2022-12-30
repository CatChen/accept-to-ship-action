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
exports.mergePullRequest = exports.checkIfPullRequestMerged = void 0;
const core_1 = require("@actions/core");
const request_error_1 = require("@octokit/request-error");
function checkIfPullRequestMerged(owner, repo, pullRequestNumber, octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        try {
            response = yield octokit.rest.pulls.checkIfMerged({
                owner,
                repo,
                pull_number: pullRequestNumber,
            });
            if (response.status === 204) {
                return true;
            }
            else {
                return false;
            }
        }
        catch (error) {
            if (error instanceof request_error_1.RequestError) {
                if (error.status === 204) {
                    return true;
                }
                else if (error.status === 404) {
                    return false;
                }
                else {
                    throw new Error(`Failed to check if pull request is merged: [${error.status}] ${error.message}`);
                }
            }
            else {
                throw error;
            }
        }
    });
}
exports.checkIfPullRequestMerged = checkIfPullRequestMerged;
function mergePullRequest(owner, repo, pullRequestNumber, mergeMethod, octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield octokit.rest.pulls.merge({
                owner,
                repo,
                pull_number: pullRequestNumber,
                merge_method: mergeMethod,
            });
            (0, core_1.setOutput)('skipped', false);
        }
        catch (error) {
            if (error instanceof request_error_1.RequestError) {
                (0, core_1.warning)(`Failed to merge pull request: [${error.status}] ${error.message}`);
                // If it's merged by someone else in a race condition we treat it as skipped,
                // because it's the same as someone else merged it before we try.
                const merged = yield checkIfPullRequestMerged(owner, repo, pullRequestNumber, octokit);
                (0, core_1.setOutput)('skipped', !merged);
            }
            else {
                throw error;
            }
        }
    });
}
exports.mergePullRequest = mergePullRequest;
