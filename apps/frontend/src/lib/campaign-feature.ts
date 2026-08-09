export function campaignLaunchesEnabled() {
  return process.env.CAMPAIGN_LAUNCHES_ENABLED !== 'false'
}
