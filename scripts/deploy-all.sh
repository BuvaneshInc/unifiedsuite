#!/bin/bash
set -e
wrangler deploy --env production
pnpm build:web
wrangler pages deploy dist
