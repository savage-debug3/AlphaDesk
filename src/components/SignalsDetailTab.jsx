import { formatUsd, formatNumber, shortAddr, getConvictionColor, getConvictionDim, getTierColor, getTierDimColor } from '../utils/formatters.js';
import Sparkline from './Sparkline.jsx';

function formatTokenAge(seconds) {
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm old';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h old';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd old';
  return Math.floor(seconds / 2592000) + 'mo old';
}

export default function SignalsDetailTab({ signals, wallets, onSelectWallet }) {
  if (!signals || signals.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-title">No conviction signals yet</span>
        <span className="empty-detail">Signals fire when 3+ smart wallets hold the same token. Run the live pipeline to detect convergence.</span>
      </div>
    );
  }

  return (
    <div className="signals-detail">
      {signals.map((sig, i) => (
        <div key={i} className="signal-detail-card">
          <div className="signal-detail-header">
            <div className="signal-detail-token-info">
              <span className="signal-detail-symbol">{sig.token.symbol}</span>
              <span className="signal-detail-name">{sig.token.name}</span>
              <span
                className="conviction-badge"
                style={{
                  background: getConvictionDim(sig.conviction),
                  color: getConvictionColor(sig.conviction),
                }}
              >
                {sig.conviction}
              </span>
            </div>
            <div className="signal-detail-price-info">
              <span className="signal-detail-price">{formatUsd(sig.price)}</span>
              <span className={`signal-change ${sig.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                {sig.priceChange24h >= 0 ? '+' : ''}{sig.priceChange24h.toFixed(1)}%
              </span>
              {sig.marketCap > 0 && (
                <span className="signal-detail-mcap">MCap: {formatNumber(sig.marketCap)}</span>
              )}
              {sig.totalHolders != null && (
                <span className="signal-detail-holders">{sig.totalHolders.toLocaleString()} holders</span>
              )}
              {sig.tokenAge != null && (
                <span className="signal-detail-age">{formatTokenAge(sig.tokenAge)}</span>
              )}
            </div>
          </div>
          {sig.sparkline?.length >= 2 && (
            <div className="signal-detail-sparkline">
              <Sparkline data={sig.sparkline} width={600} height={120} />
            </div>
          )}
          <div className="signal-detail-wallets-title">
            Held by {sig.walletCount} smart wallets
          </div>
          <div className="signal-detail-wallets-grid">
            {sig.wallets.map((addr, j) => {
              const w = wallets.find(wl => wl.address === addr);
              if (!w) return null;
              const pos = w.positions?.find(p => p.symbol === sig.token.symbol);
              return (
                <div
                  key={j}
                  className="signal-wallet-card"
                  onClick={() => onSelectWallet(w)}
                >
                  <div className="swc-header">
                    <span className="swc-addr">{shortAddr(w.address)}</span>
                    <span className="tier-badge" style={{ background: getTierDimColor(w.tier), color: getTierColor(w.tier) }}>
                      {w.tier}
                    </span>
                  </div>
                  <div className="swc-score">Score: {w.alphaScore}</div>
                  {pos && (
                    <div className="swc-position">
                      <span>{formatUsd(pos.valueUsd)}</span>
                      <span className="swc-amount">{formatNumber(pos.uiAmount)} {sig.token.symbol}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
