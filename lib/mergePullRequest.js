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
        }
        catch (error) {
            if (error instanceof request_error_1.RequestError) {
                response = error.response;
            }
        }
        if ((response === null || response === void 0 ? void 0 : response.status) === 204) {
            return true;
        }
        else if ((response === null || response === void 0 ? void 0 : response.status) === 404) {
            return false;
        }
        else {
            throw new Error(`Failed to check if pull request is merged: ${response === null || response === void 0 ? void 0 : response.status}`);
        }
    });
}
exports.checkIfPullRequestMerged = checkIfPullRequestMerged;
function mergePullRequest(owner, repo, pullRequestNumber, mergeMethod, octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield octokit.rest.pulls.merge({
            owner,
            repo,
            pull_number: pullRequestNumber,
            merge_method: mergeMethod,
        });
        if (response.status !== 200) {
            throw new Error(`Failed to merge pull request: ${response.status}`);
        }
    });
}
exports.mergePullRequest = mergePullRequest;
