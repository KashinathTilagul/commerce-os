import { test, expect } from '@playwright/test'

test.describe('System Health Check', () => {
  test('should return healthy status for all services', async ({ request }) => {
    const response = await request.get('/api/health')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('services')
    expect(data).toHaveProperty('system')
    expect(data).toHaveProperty('latencyMs')
    
    // Check critical services
    expect(data.services.database.status).toBe('healthy')
    expect(data.services.storage.status).toBe('healthy')
    
    // System metrics should be present
    expect(data.system.uptime).toBeGreaterThan(0)
    expect(data.system.memory).toBeDefined()
    expect(data.system.timestamp).toBeDefined()
    
    // Latency should be reasonable
    expect(data.latencyMs).toBeLessThan(5000)
  })

  test('should include detailed database metrics', async ({ request }) => {
    const response = await request.get('/api/health')
    const data = await response.json()
    
    expect(data.services.database).toHaveProperty('status')
    expect(data.services.database).toHaveProperty('latency')
    expect(data.services.database.latency).toBeGreaterThanOrEqual(0)
  })

  test('should handle degraded kernel status gracefully', async ({ request }) => {
    const response = await request.get('/api/health')
    const data = await response.json()
    
    // Kernel might be unreachable in test environment
    expect(['healthy', 'degraded', 'unreachable', 'not_configured']).toContain(data.services.kernel.status)
  })
})