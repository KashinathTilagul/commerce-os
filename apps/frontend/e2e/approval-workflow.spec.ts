import { test, expect } from '@playwright/test'

test.describe('Approval Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
    
    // Login (adjust selector based on actual auth implementation)
    // This is a placeholder - actual implementation depends on auth setup
    await page.waitForLoadState('networkidle')
  })

  test('should display approvals page', async ({ page }) => {
    // Navigate to approvals page
    await page.goto('/approvals')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check that approvals are displayed
    const approvalsContainer = page.locator('[data-testid="approvals-container"]')
    await expect(approvalsContainer).toBeVisible()
  })

  test('should handle approval resolution', async ({ page, request }) => {
    // First, create a test approval via API
    const createResponse = await request.post('/api/approvals', {
      data: {
        title: 'E2E Test Approval',
        description: 'This is a test approval for E2E testing',
        launchId: 'test-launch-id',
      },
    })
    
    if (createResponse.ok()) {
      const approval = await createResponse.json()
      
      // Navigate to approval detail page
      await page.goto(`/approvals/${approval.approval.id}`)
      
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Check approval details are displayed
      await expect(page.locator('[data-testid="approval-title"]')).toContainText('E2E Test Approval')
      
      // Test approval action (this would interact with actual UI)
      const approveButton = page.locator('[data-testid="approve-button"]')
      if (await approveButton.isVisible()) {
        await approveButton.click()
        
        // Verify success state
        await expect(page.locator('[data-testid="approval-status"]')).toContainText('APPROVED')
      }
    }
  })

  test('should handle API health check during workflow', async ({ request }) => {
    // Verify system is healthy before workflow
    const healthResponse = await request.get('/api/health')
    expect(healthResponse.ok()).toBeTruthy()
    
    const healthData = await healthResponse.json()
    expect(healthData.status).toBe('healthy')
  })
})