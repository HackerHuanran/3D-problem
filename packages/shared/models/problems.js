import { problems as builtInProblems } from '../../../src/data/problems.js'
import { problemSummaries } from '../../../src/data/problemSummaries.js'

export function getBuiltInProblemDetails() {
  return builtInProblems
}

export function getBuiltInProblemSummaries() {
  return problemSummaries
}

export function buildProblemMap(problemList = []) {
  return new Map((problemList || []).map((problem) => [problem.id, problem]))
}
