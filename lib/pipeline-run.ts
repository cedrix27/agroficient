import { db } from '@/lib/db'

type RunOutcome = 'success' | 'failure'

export async function recordPipelineRun(params: {
  jobName: string
  outcome: RunOutcome
  refreshedCount?: number
  error?: string | null
}) {
  await db.pipelineRun.create({
    data: {
      jobName: params.jobName,
      outcome: params.outcome,
      refreshedCount: params.refreshedCount ?? 0,
      error: params.error ?? null
    }
  })
}

export async function getPipelineRunSummary(jobName: string) {
  const [latest, lastSuccess, lastFailure, totalRuns] = await Promise.all([
    db.pipelineRun.findFirst({ where: { jobName }, orderBy: { createdAt: 'desc' } }),
    db.pipelineRun.findFirst({ where: { jobName, outcome: 'success' }, orderBy: { createdAt: 'desc' } }),
    db.pipelineRun.findFirst({ where: { jobName, outcome: 'failure' }, orderBy: { createdAt: 'desc' } }),
    db.pipelineRun.count({ where: { jobName } })
  ])

  return {
    latest,
    lastSuccessAt: lastSuccess?.createdAt ?? null,
    lastFailureAt: lastFailure?.createdAt ?? null,
    totalRuns
  }
}
