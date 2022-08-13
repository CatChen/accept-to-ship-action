import { getInput } from "@actions/core";

export function getMergeMethod() {
  const mergeMethod = getInput("merge-method");
  if (
    mergeMethod !== "merge" &&
    mergeMethod !== "squash" &&
    mergeMethod !== "rebase"
  ) {
    throw new Error(`Unsupported merge-method: ${mergeMethod}`);
  }
  return mergeMethod;
}
