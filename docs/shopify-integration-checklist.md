# Shopify Integration Checklist

This repo already has a Shopify path, but full store control needs the right scopes and a proper Shopify app install flow.

## Current authentication route

Shopify is currently blocking Composio's shared OAuth app while it is under review. EKVAAR therefore uses the Composio API-key auth config `shopify-ekvaar-merchant-app` (`ac_f7nDxRiCP9zl`) as the immediate route. The access token and permanent `myshopify.com` store domain are stored on the connected account owned by the EKVAAR organization, not shared across organizations.

Each organization must provide its credentials through the Composio-hosted connection screen. Never send a Shopify access token through chat or store it in EKVAAR's database.

For an existing Shopify Admin-created custom app, use its Admin API access token. For a new merchant-owned app created in Shopify's Dev Dashboard, client-credentials access tokens expire after 24 hours; the API-key connection must be refreshed when the token rotates. Permanent, low-friction access across unrelated merchant organizations still requires Shopify approval of a public OAuth app. Custom distribution avoids review but is limited to one store or stores in the same Shopify Plus organization.

## 1. What already exists in EKVAAR

- Shopify OAuth scaffold in `apps/frontend/src/lib/oauth.ts`
- Shopify sync route in `apps/frontend/src/app/api/shopify/sync/route.ts`
- Shopify webhook handler in `apps/frontend/src/app/api/shopify/webhook/route.ts`
- Shopify provider wrapper in `apps/frontend/src/lib/commerce/shopify-provider.ts`
- Composio tool execution for Shopify in `apps/frontend/src/lib/composio-service.ts`
- Integration DB model and tool execution logging in Prisma

## 2. What is still missing for a full Shopify integration

- Shopify app config file for declared scopes
- Full install flow for a real Shopify app installation
- Expanded OAuth scope set for product edits, new product creation, revenue reports, and theme access
- Theme app extension if you want safe storefront editing in the theme editor
- A reporting query path using ShopifyQL for revenue and sales analytics
- Webhook registration for the Shopify events you care about

## 3. Merchant-side setup required

The Shopify merchant needs to:

- Install the Shopify app from Shopify admin or the Dev Dashboard / CLI flow
- Approve the requested scopes during install or later via optional scopes
- Grant access to the shop data the agent will touch
- If theme editing is needed, approve theme-related access and install any theme app extension
- If revenue reporting is needed, approve the reports scope and any protected customer data requirements Shopify asks for

For the current Composio API-key route, the merchant must enter the permanent `myshopify.com` domain and Admin API access token in the hosted connection form. The custom storefront domain, such as `ekvaar.com`, is not the Shopify API domain.

## 4. Scope plan for a near-total Shopify agent

### Core commerce control

- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`
- `read_orders`
- `write_orders`
- `read_customers`
- `write_customers` if you intend to mutate customer records

### Historical orders

- `read_all_orders`

This is not a normal free-for-all scope. Shopify requires approval for access to all orders beyond the default window.

### Revenue and analytics

- `read_reports`

Use ShopifyQL / GraphQL Admin for revenue dashboards and sales reporting.

### Theme access

- `read_themes`
- `write_themes`

If you want safe, merchant-friendly theme integration, prefer theme app extensions and app blocks.

## 5. Recommended app config draft

Create or update `shopify.app.toml` with a required scope set and optional scopes for gradual expansion.

```toml
name = "EKVAAR OS"
client_id = "REPLACE_ME"
application_url = "https://os.ekvaar.com"
embedded = true

[access_scopes]
scopes = "read_products,write_products,read_inventory,write_inventory,read_orders,write_orders,read_customers,read_reports,read_themes,write_themes"
optional_scopes = ["read_all_orders", "write_customers"]

[access.admin]
embedded_app_direct_api_access = true
direct_api_mode = "offline"
```

## 6. Why this split makes sense

- Required scopes should cover the day-one agent use case.
- Optional scopes should cover the expensive approvals and data-heavy paths.
- `read_all_orders` is better as optional because Shopify approval can take time.
- `write_customers` is only needed if the agent truly edits customer records.

## 7. API path recommendations

- Product create/update/delete: GraphQL Admin API
- Inventory updates: GraphQL Admin API
- Order reads and status handling: GraphQL Admin API
- Revenue dashboards: ShopifyQL via GraphQL Admin API with `read_reports`
- Theme changes:
  - Use theme app extensions for injected UI
  - Use theme asset APIs only if you truly need direct theme file edits

## 8. Notes on current EKVAAR code

- `apps/frontend/src/lib/oauth.ts` currently requests only:
  - `read_products`
  - `read_orders`
  - `read_inventory`
  - `write_inventory`
- That is not enough for full product writes, theme work, or revenue reporting.
- `apps/frontend/src/lib/composio-service.ts` already exposes Shopify tools for orders, products, customers, discounts, inventory, and fulfillments, but the actual connected account still needs the right Shopify permissions behind it.

## 9. Practical next step

If you want this to be production-ready, the next minimum patch is:

- expand Shopify OAuth scopes
- add `shopify.app.toml`
- add ShopifyQL reporting support
- decide whether theme work should be direct theme API edits or theme app extensions
