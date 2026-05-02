import { BigQuery } from '@google-cloud/bigquery'

const PROJECT_ID = 'useful-theory-442820-q8'

let _client: BigQuery | null = null

export function getBigQueryClient(): BigQuery {
  if (_client) return _client

  if (process.env.GCP_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON)
    _client = new BigQuery({ projectId: PROJECT_ID, credentials })
  } else {
    _client = new BigQuery({ projectId: PROJECT_ID })
  }

  return _client
}

export function serializeBQRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(row)) {
    out[key] = serializeBQValue(val)
  }
  return out
}

function serializeBQValue(val: unknown): unknown {
  if (val === null || val === undefined) return val
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return (val as { value: string }).value
  }
  if (typeof val === 'bigint') return Number(val)
  return val
}
