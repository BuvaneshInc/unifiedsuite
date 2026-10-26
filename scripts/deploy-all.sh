#!/bin/bash
set -e

echo "==> Deploying Cloudflare Worker (CDN Edge)..."
wrangler deploy --config workers/cdn-edge/wrangler.toml

echo "==> Building Web Application..."
pnpm build:web

echo "==> Deploying Web Application to Cloudflare Pages..."
wrangler pages deploy apps/web/dist --project-name=foundry-web

