#!/usr/bin/env bash
# Commerce OS rebrand script
# Run this AFTER cloning the repo:
#   git clone https://github.com/KashinathTilagul/Retail-Operating-System.git commerce-os
#   cd commerce-os
#   bash rebrand.sh

set -e

echo "🔄  Commerce OS — rebranding repo..."

# Helper: replace in files (excluding .git and node_modules)
rpl() {
  local from="$1" to="$2"
  LC_ALL=C find . -type f \
    ! -path './.git/*' \
    ! -path '*/node_modules/*' \
    ! -path '*/dist/*' \
    ! -path '*/build/*' \
    ! -path '*/\.next/*' \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
       -o -name '*.json' -o -name '*.md' -o -name '*.yaml' -o -name '*.yml' \
       -o -name '*.env*' -o -name '*.toml' -o -name '*.html' \
       -o -name '*.css' -o -name '*.scss' -o -name 'Dockerfile' \
       -o -name 'docker-compose*' -o -name 'nginx*' -o -name '*.conf' \) \
    -exec sed -i.bak "s|${from}|${to}|g" {} +
  echo "  ✓ '$from' → '$to'"
}

# Product name
rpl "Fashion OS" "Commerce OS"
rpl "fashion-os" "commerce-os"
rpl "fashion_os" "commerce_os"
rpl "FashionOS" "CommerceOS"
rpl "Retail Operating System" "Commerce OS"
rpl "Retail-Operating-System" "commerce-os"
rpl "Shop OS" "Commerce OS"
rpl "ShopOS" "CommerceOS"
rpl "shop-os" "commerce-os"
rpl "Ekvaar OS" "Commerce OS"
rpl "EkvaarOS" "CommerceOS"
rpl "ekvaar-os" "commerce-os"

# Domain / URL
rpl "os.ekvaar.com" "commerce.abata.tech"
rpl "shopos.abata.tech" "commerce.abata.tech"

# Description strings
rpl "Open-Core Retail & E-Commerce Desktop Operating System" "Open-Core Commerce Desktop Operating System"
rpl "Open-Core Retail" "Open-Core Commerce"
rpl "fashion brands, retail operations, and e-commerce" "commerce brands, retail, and e-commerce"
rpl "for fashion brands" "for commerce brands"
rpl "created by Kashinath Tilagul / EKVAAR" "by Kashinath Tilagul / ABATA"

# Author / brand
rpl '"name": "Ekvaar"' '"name": "ABATA"'
rpl 'authors: [{ name: "Ekvaar" }]' 'authors: [{ name: "ABATA" }]'

# package.json package name
rpl '"name": "fashion-os"' '"name": "commerce-os"'

# Clean up .bak files created by sed
find . -name '*.bak' ! -path './.git/*' -delete

echo ""
echo "✅  All references updated to Commerce OS."
echo ""
echo "Next steps:"
echo "  1. Review changes:  git diff"
echo "  2. Stage & commit:  git add -A && git commit -m 'rebrand: Fashion OS → Commerce OS'"
echo "  3. Push:            git push"
echo ""
echo "Manual checks (search GitHub UI):"
echo "  - README.md hero section (may need prose rewrite)"
echo "  - apps/frontend/public/ marketing site"
echo "  - .agents/skills/ any skill descriptions"
echo "  - Branding/ folder — image file names"
