-- Track the Shopify store attached to each organization-owned OAuth token.
ALTER TABLE "OAuthToken" ADD COLUMN "shopDomain" TEXT;
