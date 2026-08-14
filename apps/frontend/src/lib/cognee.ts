const cogneeUrl = () => process.env.COGNEE_API_URL?.replace(/\/$/, '')

async function cogneeFetch(path: string, init?: RequestInit) {
  const baseUrl = cogneeUrl()
  if (!baseUrl) throw new Error('COGNEE_API_URL is not configured')
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Cognee returned ${response.status}`)
  return response.json()
}

export async function getCogneeGraph(datasetName: string) {
  const health = await cogneeFetch('/health')
  const datasets = await cogneeFetch('/api/v1/datasets') as Array<{ id: string; name: string }>
  const owned = datasets.filter((dataset) => dataset.name === datasetName)
  const graphs = await Promise.all(owned.map(async (dataset) => ({
    dataset,
    graph: await cogneeFetch(`/api/v1/datasets/${encodeURIComponent(dataset.id)}/graph`),
  })))
  return { health, datasets: owned, graphs }
}

export async function rememberWithCognee(datasetName: string, content: string) {
  const body = new FormData()
  body.append('datasetName', datasetName)
  body.append('run_in_background', 'true')
  body.append('data', new Blob([content], { type: 'text/plain' }), 'memory.txt')
  return cogneeFetch('/api/v1/remember', { method: 'POST', body })
}
