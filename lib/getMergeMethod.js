"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMergeMethod = void 0;
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
exports.getMergeMethod = getMergeMethod;
