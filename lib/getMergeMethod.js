"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMergeMethod = getMergeMethod;
const core_1 = require("@actions/core");
function getMergeMethod() {
    const mergeMethod = (0, core_1.getInput)('merge-method');
    if (mergeMethod !== 'merge' &&
        mergeMethod !== 'squash' &&
        mergeMethod !== 'rebase') {
        throw new Error(`Unsupported merge-method: ${mergeMethod}`);
    }
    return mergeMethod;
}
