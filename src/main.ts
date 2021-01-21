import * as core from '@actions/core'
import * as github from '@actions/github'
import differenceInMilliseconds from 'date-fns/differenceInMilliseconds'
import {
  getOctokit,
  eachWorkflowRun,
  getActionInputs,
  IActionInputs,
  components
} from './utils'

export function shouldDelete(
  run: components['schemas']['workflow-run'],
  actionInputs: IActionInputs
): boolean {
  const expired =
    differenceInMilliseconds(new Date(), new Date(run.created_at)) >=
    actionInputs.expireInMs
  return expired
}

export async function main(): Promise<void> {
  try {
    const actionInputs = getActionInputs()

    const octokit = getOctokit()

    const deletedRuns = []
    for await (const run of eachWorkflowRun(octokit)) {
      if (shouldDelete(run, actionInputs)) {
        try {
          core.debug(`Deleting run:\n${JSON.stringify(run, null, 2)}`)
          await octokit.actions.deleteWorkflowRun({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            // eslint-disable-next-line @typescript-eslint/camelcase
            run_id: run.id
          })
          deletedRuns.push(run)
        } catch(error) {
          core.warning(error)
        }
      }
    }
    core.setOutput('deleted-runs', JSON.stringify(deletedRuns))
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
