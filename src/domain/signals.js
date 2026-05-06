export function computeConvictionSignals(wallets, priceCache, tokenMeta, tokenHolderCount) {
  const tokenHolders = {};

  wallets.forEach(w => {
    (w.positions || []).forEach(pos => {
      const key = pos.symbol;
      if (!tokenHolders[key]) {
        tokenHolders[key] = { holders: [], pos };
      }
      if (!tokenHolders[key].holders.includes(w.address)) {
        tokenHolders[key].holders.push(w.address);
      }
    });
  });

  return Object.entries(tokenHolders)
    .filter(([, v]) => v.holders.length >= 3)
    .map(([symbol, v]) => {
      const count = v.holders.length;
      const cached = (priceCache || {})[v.pos.tokenAddress] || {};
      const creation = (tokenMeta || {})[v.pos.tokenAddress];
      const holders = (tokenHolderCount || {})[v.pos.tokenAddress];
      return {
        token: { symbol, name: v.pos.name, address: v.pos.tokenAddress },
        conviction: count >= 7 ? 'EXTREME' : count >= 5 ? 'HIGH' : 'MODERATE',
        walletCount: count,
        wallets: v.holders,
        price: cached.price || v.pos.price || 0,
        priceChange24h: cached.priceChange24h || v.pos.priceChange24h || 0,
        sparkline: cached.sparkline || v.pos.sparkline || [],
        marketCap: cached.marketCap || 0,
        tokenAge: creation?.createdTime ? Math.max(0, Date.now() / 1000 - creation.createdTime) : null,
        creator: creation?.creator || null,
        totalHolders: holders || null,
      };
    })
    .sort((a, b) => b.walletCount - a.walletCount);
}

export function deriveFeedFromTraders(allTraders, wallets, topGainers) {
  const walletScoreMap = {};
  wallets.forEach(w => { walletScoreMap[w.address] = w.alphaScore || 0; });

  const entries = allTraders.map((entry, i) => ({
    id: `tt-${i}`,
    type: 'top_trader',
    wallet: entry.wallet,
    token: entry.token,
    volume24h: entry.volume || 0,
    tradeCount: entry.tradeCount || 0,
    timestamp: Date.now() - i * 120000,
    source: 'Birdeye Top Traders',
    quality: 'derived',
    walletScore: walletScoreMap[entry.wallet] || null,
  }));

  if (topGainers && topGainers.length > 0) {
    topGainers.forEach((g, i) => {
      entries.push({
        id: `gainer-${i}`,
        type: 'top_gainer',
        wallet: g.wallet,
        token: null,
        volume24h: g.volume || 0,
        tradeCount: g.tradeCount || 0,
        pnl: g.pnl || 0,
        timestamp: Date.now() - i * 60000,
        source: 'Birdeye Top Gainers',
        quality: 'derived',
        walletScore: walletScoreMap[g.wallet] || null,
      });
    });
  }

  const traderEntries = entries.filter(e => e.type !== 'top_gainer');
  const gainerEntries = entries.filter(e => e.type === 'top_gainer');

  return [
    ...traderEntries.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0)).slice(0, 30),
    ...gainerEntries.sort((a, b) => (b.pnl || 0) - (a.pnl || 0)).slice(0, 10),
  ];
}
