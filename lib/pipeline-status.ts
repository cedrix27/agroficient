type CronRunStatus = {
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastOutcome: 'success' | 'failure' | 'never'
  lastError: string | null
}

const globalState = globalThis as unknown as {
  __pipelineCronStatus?: CronRunStatus
}

function getDefault(): CronRunStatus {
  return {
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastOutcome: 'never',
    lastError: null
  }
}

export function getCronStatus(): CronRunStatus {
  if (!globalState.__pipelineCronStatus) {
    globalState.__pipelineCronStatus = getDefault()
  }
  return globalState.__pipelineCronStatus
}

export function markCronSuccess() {
  const now = new Date().toISOString()
  const s = getCronStatus()
  s.lastRunAt = now
  s.lastSuccessAt = now
  s.lastOutcome = 'success'
  s.lastError = null
}

export function markCronFailure(error: string) {
  const now = new Date().toISOString()
  const s = getCronStatus()
  s.lastRunAt = now
  s.lastFailureAt = now
  s.lastOutcome = 'failure'
  s.lastError = error
}
