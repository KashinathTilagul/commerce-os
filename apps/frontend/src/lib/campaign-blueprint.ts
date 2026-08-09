export const CAMPAIGN_ITEMS = [
  { code: '01', title: 'Strategy brief', type: 'STRATEGY', assigneeCode: 'GROWTH', dependsOn: [] },
  { code: '02', title: 'Offer design', type: 'OFFER', assigneeCode: 'GRW_OFFER', dependsOn: ['01'] },
  { code: '03', title: 'Margin validation', type: 'MARGIN', assigneeCode: 'FIN_PRICING', dependsOn: ['02'] },
  { code: '04', title: 'Design research and originality prep', type: 'DESIGN_RESEARCH', assigneeCode: 'DES_INCLUSIVE', dependsOn: ['01'] },
  { code: '05', title: 'Image generation', type: 'IMAGE', assigneeCode: 'DES_IMG', dependsOn: ['04'] },
  { code: '06', title: 'Story and visual narrative', type: 'STORY', assigneeCode: 'DES_STORY', dependsOn: ['04'] },
  { code: '07', title: 'Brand check', type: 'BRAND', assigneeCode: 'DES_BRAND', dependsOn: ['05', '06'] },
  { code: '08', title: 'Copy and content plan', type: 'CONTENT', assigneeCode: 'MKT_CONTENT', dependsOn: ['01'] },
  { code: '09', title: 'Instagram plan', type: 'INSTAGRAM', assigneeCode: 'MKT_IG', dependsOn: ['08'] },
  { code: '10', title: 'Reel concept', type: 'VIDEO', assigneeCode: 'MKT_VIDEO', dependsOn: ['08'] },
  { code: '11', title: 'Meta Ads draft', type: 'META_ADS', assigneeCode: 'GRW_PAIDSOCIAL', dependsOn: ['08', '09', '10'] },
  { code: '12', title: 'Ad creative concepts', type: 'AD_CREATIVE', assigneeCode: 'GRW_ADCREATIVE', dependsOn: ['05', '11'] },
  { code: '13', title: 'Shopify discount draft', type: 'COMMERCE_DRAFT', serviceKey: 'COMMERCE_PREPARER', dependsOn: ['02', '03'] },
  { code: '14', title: 'Frozen founder packet', type: 'FOUNDER_PACKET', assigneeCode: 'EXE_SUMMARY', dependsOn: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'] },
] as const

export const CAMPAIGN_VALIDATIONS = [
  { domain: 'TRACKING', validatorCode: 'GRW_TRACKING', itemCode: '11' },
  { domain: 'COMPLIANCE', validatorCode: 'LEG_COMPLIANCE' },
  { domain: 'INVENTORY', validatorCode: 'OPS_MANAGER', itemCode: '13' },
  { domain: 'BRAND', validatorCode: 'DES_BRAND', itemCode: '07' },
  { domain: 'ORIGINALITY', validatorCode: 'DES_INCLUSIVE', itemCode: '05' },
  { domain: 'MARGIN', validatorCode: 'FIN_PRICING', itemCode: '03' },
  { domain: 'TECHNICAL', validatorCode: 'ENG_REVIEW', itemCode: '13' },
  { domain: 'DEVICE', validatorCode: 'ENG_FE', itemCode: '13' },
] as const
