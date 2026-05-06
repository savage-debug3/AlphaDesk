import { getTier } from '../utils/formatters.js';

function seededRng(seed) {
  let s = seed;
  return function next() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeSparkline(start, end, points, rng) {
  const data = [start];
  for (let i = 1; i < points - 1; i++) {
    const progress = i / (points - 1);
    const target = start + (end - start) * progress;
    const noise = (rng() - 0.5) * Math.abs(end - start) * 0.3;
    data.push(Math.max(0.001, target + noise));
  }
  data.push(Math.max(0.001, end));
  return data;
}

const TOKEN_POOL = [
  { symbol: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112' },
  { symbol: 'BONK', name: 'Bonk', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'WIF', name: 'dogwifhat', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: 'POPCAT', name: 'Popcat', address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
  { symbol: 'BOME', name: 'Book of Meme', address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82' },
  { symbol: 'JUP', name: 'Jupiter', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { symbol: 'PYTH', name: 'Pyth Network', address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3' },
  { symbol: 'RAY', name: 'Raydium', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
  { symbol: 'ORCA', name: 'Orca', address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' },
  { symbol: 'MNGO', name: 'Mango', address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac' },
  { symbol: 'RENDER', name: 'Render', address: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof' },
  { symbol: 'HNT', name: 'Helium', address: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux' },
  { symbol: 'MOBILE', name: 'Helium Mobile', address: 'mb1eu7TzEc71KxDpsmsKoucSSuuo6KWC499aWkfMtRt' },
  { symbol: 'JTO', name: 'Jito', address: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL' },
  { symbol: 'TENSOR', name: 'Tensor', address: 'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6' },
  { symbol: 'DRIFT', name: 'Drift', address: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7' },
];

export { TOKEN_POOL };

const WALLET_ADDRS = [
  '7xKp3nBzM4qFVj8RYdE6h2WkPt9uNmCs5A3LvGy1JQX',
  '9mWv2kLxR7qNj5Ht8FcP3YdZs6BnE1GuXJ4rA0VwTfKa',
  '4Dp8rFkN2vQhL6jW1Ct3YxZm5Bg7JnEs9A0XuRGcPwTe',
  '6sHf3gTx8nBk1YjP5LqR2WvZm7E4Jd0CuNA9XwFcGKya',
  '2nQv7cBm1RjK4sH8FwL5GxPd3Zt6E0YuNA9XkTrJVgWe',
  '8kJd5wRm2GnT1vH7Bx3PsLf4Q9Yc6ZuENA0XjFqCKWaR',
  '3pLf8nKx5QjR2Wv7Hc1BtGm4Ds6Y0ZuENA9XwTrJVgFe',
  '5Gt2mRv9Bk7Hn3Jf1LwP4Qx8Ds6CzYuENA0XjFqTKWaB',
  '1Bx6vQm3Rk8Jn5Ht7LwP2Gf4Ds9CzYuENA0XjFqTKWeC',
  '9Ck4rFj7Bn2Gv5Ht1LwP8Qx3Ds6YzMuENA0XjTqKWaRD',
];

const DEMO_NOW = Date.now();

const SCORES = [95, 91, 87, 82, 76, 71, 65, 58, 49, 41];
const PORTFOLIOS = [48200, 35400, 28100, 22500, 18300, 12700, 8900, 4200, 2100, 520];

function buildDemoPositions(walletIdx, rng) {
  const count = [8, 7, 9, 6, 7, 5, 8, 4, 6, 3][walletIdx] || 5;
  const indices = [];
  for (let i = 0; i < TOKEN_POOL.length; i++) indices.push(i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const picked = indices.slice(0, count);

  return picked.map(idx => {
    const token = TOKEN_POOL[idx];
    const basePrice = token.symbol === 'SOL' ? 155 : [0.00003, 2.34, 0.45, 0.012, 1.12, 0.42, 5.8, 0.9, 0.04, 1.3, 7.2, 0.005, 3.4, 1.8, 2.1][idx] || 1;
    const change = -15 + rng() * 40;
    const price = basePrice * (1 + (rng() - 0.5) * 0.1);
    const startPrice = price * (1 - change / 200);
    return {
      tokenAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      uiAmount: parseFloat((50 + rng() * 5000).toFixed(2)),
      valueUsd: parseFloat((100 + rng() * 12000).toFixed(2)),
      priceChange24h: parseFloat(change.toFixed(2)),
      price: parseFloat(price.toFixed(6)),
      sparkline: makeSparkline(startPrice, price, 24, rng),
      securityRisk: ['LOW', 'LOW', 'LOW', 'MEDIUM', 'LOW'][Math.floor(rng() * 5)],
    };
  });
}

const rng = seededRng(42);

export const DEMO_WALLETS = WALLET_ADDRS.map((addr, i) => {
  const positions = buildDemoPositions(i, rng);
  const score = SCORES[i];
  const scoreBreakdown = {
    coverage: { score: Math.round((positions.length / 10) * 30), max: 30, detail: `${positions.length} trending tokens` },
    recency: { score: i < 4 ? 20 : i < 7 ? 12 : 4, max: 20, detail: i < 4 ? 'Active <6h' : i < 7 ? 'Active <24h' : 'Active <72h' },
    diversity: { score: positions.length >= 3 && positions.length <= 15 ? 15 : 8, max: 15, detail: `${positions.length} positions` },
    quality: { score: 10, max: 10, detail: 'No high-risk tokens' },
    elite: { score: i < 5 ? 10 : i < 7 ? 5 : 0, max: 10, detail: i < 5 ? 'Appears in 5+ trending tokens' : 'Standard' },
    profitability: { score: i < 3 ? 15 : i < 6 ? 12 : i < 8 ? 8 : 3, max: 15, detail: 'Demo PnL' },
  };
  return {
    address: addr,
    alphaScore: score,
    scoreBreakdown,
    portfolio: PORTFOLIOS[i],
    positions,
    walletPnl: {
      totalPnl: (rng() - 0.3) * 50000,
      realizedPnl: (rng() - 0.3) * 30000,
      unrealizedPnl: (rng() - 0.3) * 20000,
      totalInvested: rng() * 100000 + 10000,
      pnlPercent: (rng() - 0.3) * 200,
    },
    tier: getTier(score),
    lastActive: DEMO_NOW - (i * 1800000 + 300000),
    appearsInTokens: positions.map(p => p.symbol),
    lastTradeTimestamp: DEMO_NOW - (i * 3600000 + 600000),
  };
});

const wif = TOKEN_POOL.find(t => t.symbol === 'WIF');
const bonk = TOKEN_POOL.find(t => t.symbol === 'BONK');
const jup = TOKEN_POOL.find(t => t.symbol === 'JUP');

export const DEMO_SIGNALS = [
  {
    token: { symbol: 'WIF', name: 'dogwifhat', address: wif.address },
    conviction: 'EXTREME',
    walletCount: 7,
    wallets: DEMO_WALLETS.slice(0, 7).map(w => w.address),
    price: 2.34,
    priceChange24h: 15.7,
    sparkline: makeSparkline(1.8, 2.34, 24, rng),
    marketCap: 2340000000,
    totalHolders: Math.floor(rng() * 10000) + 100,
    tokenAge: Math.floor(rng() * 2592000),
  },
  {
    token: { symbol: 'BONK', name: 'Bonk', address: bonk.address },
    conviction: 'HIGH',
    walletCount: 5,
    wallets: DEMO_WALLETS.slice(0, 5).map(w => w.address),
    price: 0.00002847,
    priceChange24h: 8.3,
    sparkline: makeSparkline(0.000024, 0.00002847, 24, rng),
    marketCap: 1870000000,
    totalHolders: Math.floor(rng() * 10000) + 100,
    tokenAge: Math.floor(rng() * 2592000),
  },
  {
    token: { symbol: 'JUP', name: 'Jupiter', address: jup.address },
    conviction: 'MODERATE',
    walletCount: 3,
    wallets: DEMO_WALLETS.slice(0, 3).map(w => w.address),
    price: 1.12,
    priceChange24h: -3.2,
    sparkline: makeSparkline(1.18, 1.12, 24, rng),
    marketCap: 1520000000,
    totalHolders: Math.floor(rng() * 10000) + 100,
    tokenAge: Math.floor(rng() * 2592000),
  },
];

export const DEMO_FEED = [
  { id: 'df-0', type: 'top_trader', wallet: WALLET_ADDRS[0], token: wif, volume24h: 284300, tradeCount: 47, timestamp: DEMO_NOW - 180000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-1', type: 'top_trader', wallet: WALLET_ADDRS[1], token: bonk, volume24h: 198700, tradeCount: 32, timestamp: DEMO_NOW - 480000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-2', type: 'top_trader', wallet: WALLET_ADDRS[2], token: jup, volume24h: 156200, tradeCount: 28, timestamp: DEMO_NOW - 780000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-3', type: 'top_trader', wallet: WALLET_ADDRS[0], token: bonk, volume24h: 142800, tradeCount: 19, timestamp: DEMO_NOW - 1200000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-4', type: 'top_trader', wallet: WALLET_ADDRS[3], token: wif, volume24h: 98400, tradeCount: 15, timestamp: DEMO_NOW - 1680000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-5', type: 'top_trader', wallet: WALLET_ADDRS[4], token: TOKEN_POOL[7], volume24h: 87200, tradeCount: 22, timestamp: DEMO_NOW - 2100000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-6', type: 'top_trader', wallet: WALLET_ADDRS[1], token: TOKEN_POOL[6], volume24h: 76500, tradeCount: 11, timestamp: DEMO_NOW - 2700000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-7', type: 'top_trader', wallet: WALLET_ADDRS[5], token: TOKEN_POOL[3], volume24h: 65300, tradeCount: 9, timestamp: DEMO_NOW - 3300000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-8', type: 'top_trader', wallet: WALLET_ADDRS[2], token: TOKEN_POOL[10], volume24h: 54100, tradeCount: 14, timestamp: DEMO_NOW - 3900000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-9', type: 'top_trader', wallet: WALLET_ADDRS[6], token: TOKEN_POOL[4], volume24h: 43800, tradeCount: 7, timestamp: DEMO_NOW - 4500000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-10', type: 'top_trader', wallet: WALLET_ADDRS[3], token: TOKEN_POOL[13], volume24h: 38200, tradeCount: 12, timestamp: DEMO_NOW - 5400000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-11', type: 'top_trader', wallet: WALLET_ADDRS[7], token: TOKEN_POOL[11], volume24h: 29400, tradeCount: 5, timestamp: DEMO_NOW - 6300000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-12', type: 'top_trader', wallet: WALLET_ADDRS[4], token: TOKEN_POOL[14], volume24h: 22100, tradeCount: 8, timestamp: DEMO_NOW - 7200000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-13', type: 'top_trader', wallet: WALLET_ADDRS[8], token: TOKEN_POOL[9], volume24h: 18700, tradeCount: 4, timestamp: DEMO_NOW - 8100000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-14', type: 'top_trader', wallet: WALLET_ADDRS[5], token: TOKEN_POOL[15], volume24h: 14500, tradeCount: 6, timestamp: DEMO_NOW - 9000000, source: 'Demo Snapshot', quality: 'sample' },
  { id: 'df-15', type: 'top_trader', wallet: WALLET_ADDRS[9], token: TOKEN_POOL[8], volume24h: 11200, tradeCount: 3, timestamp: DEMO_NOW - 10800000, source: 'Demo Snapshot', quality: 'sample' },
];
