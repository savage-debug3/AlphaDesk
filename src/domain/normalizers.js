export function normalizeTokenList(resp) {
  const tokens = resp?.data?.tokens || resp?.data?.items || [];
  return tokens.map(t => ({
    address: t.address || '',
    symbol: t.symbol || 'UNK',
    name: t.name || t.symbol || 'Unknown',
    price: t.price ?? t.priceUsd ?? 0,
    volume24h: t.v24hUSD ?? t.volume24h ?? 0,
    liquidity: t.liquidity ?? 0,
    logoURI: t.logoURI || null,
  })).filter(t => t.address);
}

export function normalizeTopTraders(resp) {
  const traders = resp?.data?.traders || resp?.data?.items || [];
  return traders.map(t => ({
    wallet: t.owner || t.address || '',
    volume: t.volume ?? t.volumeUSD ?? 0,
    volumeUsd: t.volumeUsd ?? t.volumeUSD ?? t.volume ?? 0,
    tradeCount: t.trade ?? t.trade_count ?? t.tradeCount ?? 0,
    buyVolume: t.volumeBuy ?? t.buy_volume ?? t.buyVolume ?? 0,
    sellVolume: t.volumeSell ?? t.sell_volume ?? t.sellVolume ?? 0,
    totalPnl: t.totalPnl ?? 0,
    realizedPnl: t.realizedPnl ?? 0,
  })).filter(t => t.wallet);
}

export function normalizeWalletTokens(resp) {
  const items = resp?.data?.items || resp?.data || [];
  return items
    .map(item => ({
      tokenAddress: item.address || '',
      symbol: item.symbol || 'UNK',
      name: item.name || item.symbol || 'Unknown',
      uiAmount: item.uiAmount ?? 0,
      valueUsd: item.valueUsd ?? 0,
      priceUsd: item.priceUsd ?? 0,
    }))
    .filter(item => item.valueUsd > 1)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 15);
}

export function normalizeTokenOverview(resp) {
  const d = resp?.data || {};
  return {
    price: d.price ?? d.priceUsd ?? 0,
    priceChange24h: d.priceChange24hPercent ?? d.priceChange24h ?? 0,
    marketCap: d.mc ?? d.marketCap ?? d.realMc ?? 0,
    volume24h: d.v24hUSD ?? d.volume24h ?? 0,
  };
}

export function normalizePriceHistory(resp) {
  const items = resp?.data?.items || [];
  return items.map(h => h.value ?? h.close ?? h.price ?? 0).filter(v => v > 0);
}

export function normalizeWalletPnl(resp) {
  const d = resp?.data || {};
  return {
    totalPnl: d.total ?? d.totalPnl ?? 0,
    realizedPnl: d.realized ?? d.realizedPnl ?? 0,
    unrealizedPnl: d.unrealized ?? d.unrealizedPnl ?? 0,
    totalInvested: d.totalInvested ?? d.total_invested ?? 0,
    pnlPercent: d.pnlPercent ?? (d.totalInvested ? ((d.total ?? 0) / d.totalInvested) * 100 : 0),
  };
}

export function normalizeTokenCreation(resp) {
  const d = resp?.data || {};
  return {
    txHash: d.txHash ?? d.tx_hash ?? '',
    creator: d.creator ?? d.owner ?? '',
    createdTime: d.blockUnixTime ?? d.slot_time ?? d.createdTime ?? 0,
    slot: d.slot ?? 0,
  };
}

export function normalizeTokenHolder(resp) {
  const d = resp?.data || {};
  return {
    totalHolders: d.total ?? d.totalHolders ?? 0,
  };
}

export function normalizeTraderGainersLosers(resp) {
  const items = resp?.data?.items || resp?.data || [];
  return items.map(t => ({
    wallet: t.address ?? t.owner ?? '',
    pnl: t.pnl ?? t.totalPnl ?? 0,
    volume: t.volume ?? t.volumeUsd ?? 0,
    tradeCount: t.trade ?? t.tradeCount ?? 0,
  })).filter(t => t.wallet);
}

/* Birdeye token_security fields vary; normalize to a consistent risk assessment */
export function normalizeTokenSecurity(resp) {
  const sec = resp?.data || {};
  const flags = [];
  if (sec.freezeable || sec.freezeAuthority) flags.push('freeze_authority');
  if (sec.isToken2022) flags.push('token2022');
  if (sec.transferFeeEnable) flags.push('transfer_fee');
  if (sec.isTrueToken === false) flags.push('not_verified');
  if ((sec.top10HolderPercent ?? 0) > 80) flags.push('concentrated_holders');

  let risk = 'LOW';
  if (flags.includes('not_verified') || flags.includes('concentrated_holders')) risk = 'HIGH';
  else if (flags.length > 0) risk = 'MEDIUM';

  return {
    risk,
    flags,
    top10HolderPercent: sec.top10HolderPercent ?? null,
    freezeAuthority: !!(sec.freezeable || sec.freezeAuthority),
    mintAuthority: !!sec.mintAuthority,
  };
}
