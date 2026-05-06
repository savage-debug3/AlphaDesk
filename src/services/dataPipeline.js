import { delay } from './birdeye.js';
import {
  normalizeTokenList,
  normalizeTopTraders,
  normalizeWalletTokens,
  normalizeTokenOverview,
  normalizePriceHistory,
  normalizeTokenSecurity,
  normalizeWalletPnl,
  normalizeTokenCreation,
  normalizeTokenHolder,
  normalizeTraderGainersLosers,
} from '../domain/normalizers.js';
import { computeAlphaScore } from '../domain/scoring.js';
import { computeConvictionSignals, deriveFeedFromTraders } from '../domain/signals.js';

export async function runLivePipeline(client, onStep) {
  const meta = { endpointsUsed: 0, tokensScanned: 0, walletsEnriched: 0 };
  const step = (idx) => onStep?.(idx);

  step(1);
  const tokenListResp = await client.apiFetch(
    '/defi/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=10&min_liquidity=100000'
  );
  meta.endpointsUsed++;
  const tokens = normalizeTokenList(tokenListResp);
  if (tokens.length === 0) throw new Error('No trending tokens found');
  meta.tokensScanned = tokens.length;

  step(2);
  const allTraders = [];
  for (const token of tokens.slice(0, 10)) {
    try {
      const resp = await client.apiFetch(
        `/defi/v2/tokens/top_traders?address=${token.address}&time_frame=24h&sort_by=volume&sort_type=desc&offset=0&limit=10`
      );
      meta.endpointsUsed++;
      const traders = normalizeTopTraders(resp);
      traders.forEach(t => {
        allTraders.push({
          wallet: t.wallet,
          token,
          volume: t.volume,
          volumeUsd: t.volumeUsd,
          tradeCount: t.tradeCount,
          totalPnl: t.totalPnl,
          realizedPnl: t.realizedPnl,
        });
      });
    } catch { /* skip failed token */ }
    await delay(200);
  }

  step(3);
  const walletMap = {};
  allTraders.forEach(({ wallet, token, volume, volumeUsd, tradeCount, totalPnl, realizedPnl }) => {
    if (!wallet) return;
    if (!walletMap[wallet]) {
      walletMap[wallet] = {
        address: wallet,
        appearsInTokens: [],
        lastTradeTimestamp: Date.now(),
        totalVolumeUsd: 0,
        totalTrades: 0,
        totalPnl: 0,
        realizedPnl: 0,
      };
    }
    if (!walletMap[wallet].appearsInTokens.includes(token.symbol)) {
      walletMap[wallet].appearsInTokens.push(token.symbol);
    }
    walletMap[wallet].totalVolumeUsd += (volumeUsd || volume || 0);
    walletMap[wallet].totalTrades += (tradeCount || 0);
    walletMap[wallet].totalPnl += (totalPnl || 0);
    walletMap[wallet].realizedPnl += (realizedPnl || 0);
  });
  const uniqueWallets = Object.values(walletMap)
    .sort((a, b) => b.appearsInTokens.length - a.appearsInTokens.length)
    .slice(0, 10);
  if (uniqueWallets.length === 0) throw new Error('No wallets discovered');

  step(4);
  const tokenAddresses = new Set();
  for (const w of uniqueWallets) {
    try {
      const resp = await client.apiFetch(`/v1/wallet/token_list?wallet=${w.address}`);
      meta.endpointsUsed++;
      const items = normalizeWalletTokens(resp);
      w.positions = items.map(item => {
        if (item.tokenAddress) tokenAddresses.add(item.tokenAddress);
        return {
          tokenAddress: item.tokenAddress,
          symbol: item.symbol,
          name: item.name,
          uiAmount: item.uiAmount,
          valueUsd: item.valueUsd,
          priceChange24h: 0,
          sparkline: [],
          securityRisk: 'LOW',
          price: item.priceUsd,
        };
      });
      w.portfolio = w.positions.reduce((s, p) => s + p.valueUsd, 0);
      meta.walletsEnriched++;
    } catch {
      w.positions = [];
      w.portfolio = 0;
      w.portfolioFallback = true;
    }
    await delay(200);
  }

  for (const w of uniqueWallets) {
    if (w.portfolioFallback) {
      w.portfolio = w.totalVolumeUsd || 0;
      w.portfolioLabel = '24h Vol';
    }
  }

  step(5);
  const priceCache = {};
  const addrList = Array.from(tokenAddresses).slice(0, 30);
  const unixNow = Math.floor(Date.now() / 1000);
  const unix24h = unixNow - 86400;

  for (const addr of addrList) {
    try {
      const [overviewResp, historyResp] = await Promise.all([
        client.apiFetch(`/defi/token_overview?address=${addr}`),
        client.apiFetch(`/defi/history_price?address=${addr}&address_type=token&type=30m&time_from=${unix24h}&time_to=${unixNow}`),
      ]);
      meta.endpointsUsed += 2;
      const overview = normalizeTokenOverview(overviewResp);
      const history = normalizePriceHistory(historyResp);
      priceCache[addr] = {
        price: overview.price,
        priceChange24h: overview.priceChange24h,
        sparkline: history.length >= 2 ? history : null,
        marketCap: overview.marketCap,
      };
    } catch { /* skip */ }
    await delay(150);
  }

  for (const w of uniqueWallets) {
    for (const pos of w.positions || []) {
      const cached = priceCache[pos.tokenAddress];
      if (cached) {
        pos.priceChange24h = cached.priceChange24h;
        if (cached.sparkline) pos.sparkline = cached.sparkline;
        if (cached.price) pos.price = cached.price;
      }
    }
  }

  step(6);
  for (const addr of addrList.slice(0, 15)) {
    try {
      const resp = await client.apiFetch(`/defi/token_security?address=${addr}`);
      meta.endpointsUsed++;
      const sec = normalizeTokenSecurity(resp);
      for (const w of uniqueWallets) {
        for (const pos of w.positions || []) {
          if (pos.tokenAddress === addr) {
            pos.securityRisk = sec.risk;
            pos.securityFlags = sec.flags;
            pos.securityDetail = sec;
          }
        }
      }
    } catch { /* skip */ }
    await delay(150);
  }

  step(7);
  for (const w of uniqueWallets) {
    try {
      const resp = await client.apiFetch(`/wallet/v2/pnl-summary?wallet=${w.address}`);
      meta.endpointsUsed++;
      const pnl = normalizeWalletPnl(resp);
      w.walletPnl = pnl;
    } catch {
      w.walletPnl = null;
    }
    await delay(200);
  }

  step(8);
  const tokenMeta = {};
  const candidateTokens = [];
  const tokenHolderCount = {};

  const tokenWalletCounts = {};
  uniqueWallets.forEach(w => {
    (w.positions || []).forEach(pos => {
      if (!tokenWalletCounts[pos.tokenAddress]) tokenWalletCounts[pos.tokenAddress] = 0;
      tokenWalletCounts[pos.tokenAddress]++;
    });
  });
  Object.entries(tokenWalletCounts)
    .filter(([, count]) => count >= 2)
    .forEach(([addr]) => candidateTokens.push(addr));

  for (const addr of candidateTokens.slice(0, 15)) {
    try {
      const [creationResp, holderResp] = await Promise.all([
        client.apiFetch(`/defi/token_creation_info?address=${addr}`),
        client.apiFetch(`/defi/v3/token/holder?address=${addr}&offset=0&limit=1`),
      ]);
      meta.endpointsUsed += 2;
      tokenMeta[addr] = normalizeTokenCreation(creationResp);
      tokenHolderCount[addr] = normalizeTokenHolder(holderResp).totalHolders;
    } catch { /* skip */ }
    await delay(150);
  }

  step(9);
  let topGainers = [];
  try {
    const resp = await client.apiFetch('/trader/gainers-losers?time_frame=24h&sort_by=PnL&sort_type=desc&offset=0&limit=10');
    meta.endpointsUsed++;
    topGainers = normalizeTraderGainersLosers(resp);
  } catch { /* skip */ }

  step(10);
  const scoredWallets = uniqueWallets.map(w => {
    const result = computeAlphaScore(w);
    return {
      ...w,
      alphaScore: result.total,
      scoreBreakdown: result.breakdown,
      tier: result.tier,
      lastActive: w.lastTradeTimestamp || Date.now(),
    };
  }).sort((a, b) => b.alphaScore - a.alphaScore);

  const signals = computeConvictionSignals(scoredWallets, priceCache, tokenMeta, tokenHolderCount);
  const feed = deriveFeedFromTraders(allTraders, scoredWallets, topGainers);

  step(11);
  return { wallets: scoredWallets, signals, feed, meta };
}
