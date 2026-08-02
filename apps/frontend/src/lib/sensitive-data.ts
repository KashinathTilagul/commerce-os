const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apiKey', 'secretKey', 'accessToken', 'refreshToken']

export function filterSensitiveData<T>(data: T): T {
  if (typeof data !== 'object' || data === null) return data
  if (data instanceof Date) return data.toISOString() as T
  if (Array.isArray(data)) return data.map(filterSensitiveData) as T

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [
      key,
      SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))
        ? '***REDACTED***'
        : filterSensitiveData(value),
    ]),
  ) as T
}
