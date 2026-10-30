# Shopify Integration Checklist

This repo already has a Shopify path, but full store control needs the right scopes and a proper Shopify app install flow.

## Current authentication route

EKVAAR uses the custom Composio OAuth config `shopify-tacvjh` (`ac_wPXwhDOiLHc3`). Every connected account is owned by one EKVAAR organization, so credentials are never shared across organizations.

Each organization enters only its permanent `myshopify.com` subdomain in the Composio-hosted connection screen and authorizes the Shopify app. Never send a Shopify access token through chat or store it in EKVAAR's database.

The OAuth connection avoids the 24-hour lifetime of Shopify client-credentials tokens. Installing the app across unrelated merchant organizations still requires Shopify approval of the app's public distribution. Custom distribution avoids review but is limited to one store or stores in the same Shopify Plus organization.

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

The merchant must enter the permanent `myshopify.com` subdomain in the hosted connection form. The custom storefront domain, such as `ekvaar.com`, is not the Shopify API domain.

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
application_url = "https://commerce.abata.tech"
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
