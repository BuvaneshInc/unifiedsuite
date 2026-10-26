#!/bin/bash
set -e

echo "==> Building web assets..."
pnpm build:web

echo "==> Packaging Desktop application via Tauri..."
cd apps/desktop && npx @tauri-apps/cli build

