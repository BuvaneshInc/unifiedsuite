
# Foundry Deployment Architecture - Global, 1M Users

## Architecture

User Devices (Global) -> Tauri Desktop + PWA Mobile + Web
  Envelope Only (2KB per doc) -> Cloudflare Edge (300+ PoPs)
  Workers: /sync/* KV_SYNC, /models/* R2, /p2p/* KV, /telemetry
  P2P Direct WebRTC ML-KEM-768, no cloud relay

No central DB with content. Content lives on devices only.

## Cost for 1M Active Users / Month

Assumptions: 100 docs/user, 2KB envelope, 10 syncs/day, 20% new users download 10MB models

Workers: $5 base includes 10M requests, beyond $0.30 per million - 600M requests = $182
KV: Reads $0.50/M, Writes $0.50/M, Storage $0.50/GB-month - 400M reads, 330M writes, 210GB = $470
R2: Storage $0.015/GB-month, Class A $4.50/M, Class B $0.36/M, zero egress - 55GB + 1M reads = ~$2
Total: ~$674/month for 1M users = $0.000674 per user

Scaling 10M = $6740/month. AWS would be ~$1500+ due to egress $0.09/GB.

## Push to Live Steps

1. Repo: git clone <your-repo>, pnpm install
2. Cloudflare: wrangler login, kv:namespace create SYNC_KV, P2P_KV, r2 bucket create foundry-model-cache, d1 create transparency-log
3. Deploy Workers: cd workers/cdn && wrangler deploy --env production
4. Upload Models: ./scripts/upload-models.sh (to R2)
5. Build Desktop: pnpm tauri build -> .msi .dmg .deb in bundle/
6. Build Web: pnpm build:web && wrangler pages deploy dist
7. CI: .github/workflows/deploy.yml auto deploys on push main + builds desktop on tag v*

See README.md for dev quick start.
