# AlphaDesk — Smart Money Intelligence Terminal for Solana

> Discover high-performing wallets on-chain, rank them by AlphaScore, and surface conviction signals when multiple smart wallets converge on the same token.

[![Live Demo](https://img.shields.io/badge/Live-alpha--desk--eight.vercel.app-00D4A8?style=flat-square)](https://alpha-desk-eight.vercel.app/)
[![Built with Birdeye Data](https://img.shields.io/badge/Powered%20by-Birdeye%20Data%20API-blue?style=flat-square)](https://bds.birdeye.so/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

---

## What It Does

AlphaDesk runs a multi-step data pipeline against the Birdeye API to:

1. **Discover trending tokens** — Fetches the top 10 Solana tokens by 24h volume
2. **Identify top traders** — Pulls the top 10 traders per token (up to 100 wallets)
3. **Deduplicate & rank wallets** — Finds wallets that appear across multiple trending tokens
4. **Enrich portfolios** — Fetches each wallet's full token holdings
5. **Price & security analysis** — Gets real-time prices, sparklines, and security risk flags
6. **Compute AlphaScore** — A 6-factor heuristic (0–100) that ranks wallet intelligence
7. **Surface conviction signals** — Detects when 3+ scored wallets converge on the same token
8. **Generate activity feed** — Derives a live feed from top trader and top earner data

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       React Frontend                             │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌───────────┐ │
│  │Leaderboard│ │  Signals │ │  Feed  │ │Overlap │ │ Watchlist │ │
│  │  (sort,   │ │  Panel   │ │(derived│ │(matrix)│ │(starred,  │ │
│  │  search,  │ │  (left)  │ │  from  │ │        │ │ persisted)│ │
│  │  export)  │ │          │ │  API)  │ │        │ │           │ │
│  └─────┬─────┘ └────┬─────┘ └───┬────┘ └───┬────┘ └─────┬─────┘ │
│        └─────────────┴──────────┴──────────┴────────────┘       │
│                         │                                        │
│              ┌──────────┴──────────┐                             │
│              │   Data Pipeline     │                             │
│              │  (11-step orchestr.)│                             │
│              └──────────┬──────────┘                             │
│                         │                                        │
│         ┌───────────────┼───────────────┐                        │
│         │               │               │                        │
│    ┌────┴────┐   ┌──────┴──────┐  ┌─────┴─────┐                 │
│    │ Scoring │   │ Normalizers │  │  Signals  │                 │
│    │(6-factor│   │ (defensive  │  │(conviction│                 │
│    │  alpha) │   │  parsing)   │  │  + feed)  │                 │
│    └─────────┘   └─────────────┘  └───────────┘                 │
└────────────────────────┬─────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │  Vercel Serverless  │
              │   Proxy (hardened)  │
              │  • Endpoint allow-  │
              │    list (10 paths)  │
              │  • Rate limiting    │
              │  • CORS validation  │
              │  • Param sanitize   │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              │   Birdeye Data API  │
              │  (public-api.birdeye│
              │        .so)         │
              └─────────────────────┘
```

## Birdeye API Endpoints Used

| Endpoint | Purpose | Cache |
|----------|---------|-------|
| `/defi/tokenlist` | Top trending tokens by 24h volume | 60s |
| `/defi/v2/tokens/top_traders` | Top 10 traders per token | 30s |
| `/v1/wallet/token_list` | Wallet portfolio holdings | 30s |
| `/defi/token_overview` | Price, volume, market cap | 60s |
| `/defi/history_price` | 24h price history for sparklines | 120s |
| `/defi/token_security` | Security risk assessment | 300s |
| `/wallet/v2/pnl-summary` | Wallet profit & loss data | 60s |
| `/defi/token_creation_info` | Token age and creator | 300s |
| `/defi/v3/token/holder` | Total holder count per token | 120s |
| `/trader/gainers-losers` | Top profitable traders | 60s |

A full pipeline run makes **80–120+ API calls** depending on wallet/token count.

## AlphaScore

A heuristic intelligence metric (0–100) composed of:

| Factor | Max | Description |
|--------|-----|-------------|
| Coverage | 30 | Trending tokens where this wallet is a top trader |
| Recency | 20 | How recently the wallet was active |
| Profitability | 15 | Wallet PnL from Birdeye (realized + unrealized) |
| Diversity | 15 | Portfolio composition (3–15 tokens = optimal) |
| Data Quality | 10 | Adjusted by security risk of held tokens |
| Elite Bonus | 10 | Extra points for 5+ trending token appearances |

**Tiers**: ELITE (80+) · SMART (50–79) · ACTIVE (< 50)

## Features

- **Smart Money Leaderboard** — Sortable by any column, searchable, exportable as CSV
- **Conviction Signals** — Auto-detects tokens held by 3+ smart wallets with conviction levels (MODERATE → HIGH → EXTREME)
- **Wallet PnL Tracking** — Real profit/loss data per wallet from Birdeye, integrated into scoring and leaderboard
- **Token Intelligence** — Creation age and holder count on conviction signals for deeper context
- **Top Earners Feed** — Surfaces the most profitable traders from Birdeye's gainers/losers data
- **Token Overlap Matrix** — Visual heatmap showing which wallets share positions across tokens
- **Wallet Watchlist** — Star wallets to track them across sessions (persisted via localStorage)
- **Activity Feed** — Derived from Birdeye top trader data, not fabricated
- **Wallet Detail Drawer** — Per-factor score breakdown, position list with sparklines, security flags
- **Three Data Modes** — Demo (instant, no key needed), Live via Proxy (server-side key), Live via User Key
- **Auto-Refresh** — Configurable 30s / 1m / 5m intervals in live mode
- **Keyboard Shortcuts** — R (refresh), D (demo), L (live), 1–5 (tabs), W (toggle watchlist), ? (help)
- **Solscan Integration** — Deep links to verify wallets on-chain
- **Pipeline Stats** — Shows API calls made, tokens scanned, wallets enriched, and timing
- **Cache Validation** — Cached payloads are structurally validated before use; malformed data is treated as a cache miss

## Proxy Security

The Vercel serverless proxy (`api/birdeye.js`) implements:

- **Endpoint allowlist** — Only 10 specific Birdeye paths are permitted (no wildcard)
- **Parameter validation** — Query params checked for length and character safety
- **CORS** — Same-origin default; configurable via `ALLOWED_ORIGINS` env var
- **Rate limiting** — IP-based, 150 req/min (best-effort for serverless cold starts)
- **Cache headers** — Per-endpoint `s-maxage` with `stale-while-revalidate`
- **No secret leakage** — Error responses are structured without internal details

## Quick Start

```bash
git clone https://github.com/savage-debug3/AlphaDesk.git
cd AlphaDesk
npm install
npm run dev
```

Opens at `http://localhost:5173` in Demo mode. No API key needed.

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Set env: `BIRDEYE_API_KEY` = your Birdeye API key
4. Optionally set `ALLOWED_ORIGINS` for CORS
5. Deploy — live at your Vercel URL

## Project Structure

```
AlphaDesk/
├── api/birdeye.js              # Hardened Vercel serverless proxy
├── src/
│   ├── App.jsx                 # Root: state, mode control, shortcuts
│   ├── styles.css              # Dark theme, responsive, all styles
│   ├── components/
│   │   ├── Header.jsx          # Mode toggle, API key, refresh, auto-refresh
│   │   ├── ModeBanner.jsx      # Data source status banner
│   │   ├── LeaderboardTab.jsx  # Sortable, searchable wallet ranking + star
│   │   ├── FeedTab.jsx         # Activity feed (derived from API)
│   │   ├── SignalsPanel.jsx    # Left sidebar conviction signals
│   │   ├── SignalsDetailTab.jsx# Expanded signal view with holders
│   │   ├── OverlapTab.jsx      # Token overlap matrix across wallets
│   │   ├── WatchlistTab.jsx    # Starred wallets persistent view
│   │   ├── WalletDrawer.jsx    # Wallet detail + score breakdown
│   │   ├── AlphaScoreExplainer.jsx # Methodology modal
│   │   ├── Sparkline.jsx       # SVG sparkline charts
│   │   ├── LoadingScreen.jsx   # Pipeline progress overlay
│   │   └── Footer.jsx          # Attribution + shortcuts hint
│   ├── services/
│   │   ├── birdeye.js          # API client (proxy/direct/demo)
│   │   └── dataPipeline.js     # 11-step live pipeline orchestration
│   ├── domain/
│   │   ├── scoring.js          # AlphaScore with 6-factor breakdown
│   │   ├── signals.js          # Conviction detection + feed derivation
│   │   └── normalizers.js      # Defensive Birdeye response parsing
│   ├── data/demoData.js        # Deterministic demo data
│   └── utils/formatters.js     # USD, number, time, address formatting
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Tech Stack

- **Frontend**: React 19 + Vite 8 (zero UI framework dependencies)
- **API**: Birdeye Data API (10 endpoints, 80–120+ calls per pipeline run)
- **Proxy**: Vercel Serverless Functions (Node.js)
- **Styling**: Custom CSS with CSS variables (dark trading terminal theme)
- **Deployment**: Vercel

## Disclaimer

AlphaDesk is an analytical tool for on-chain data exploration. It does not constitute financial advice, investment recommendation, or trading signals. AlphaScore is a heuristic metric — past wallet activity does not predict future performance.

## License

MIT
