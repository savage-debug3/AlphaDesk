import { formatUsd, shortAddr, getConvictionColor, getConvictionDim } from '../utils/formatters.js';
import Sparkline from './Sparkline.jsx';

function formatTokenAge(seconds) {
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm old';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h old';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd old';
  return Math.floor(seconds / 2592000) + 'mo old';
}

export default function SignalsPanel({ signals, wallets, onSelectWallet }) {
  if (!signals || signals.length === 0) {
    return (
      <aside className="signals-panel">
        <div className="panel-title">Conviction Signals</div>
        <div className="empty-state">No signals yet</div>
      </aside>
    );
  }

  return (
    <aside className="signals-panel">
      <div className="panel-title">Conviction Signals</div>
      <div className="signals-list">
        {signals.map((sig, i) => (
          <div
            key={i}
            className={`signal-card ${sig.conviction === 'EXTREME' ? 'extreme' : ''}`}
          >
            <div className="signal-header">
              <span
                className="conviction-badge"
                style={{
                  background: getConvictionDim(sig.conviction),
                  color: getConvictionColor(sig.conviction),
                }}
              >
                {sig.conviction}
              </span>
              <span className="signal-wallet-count">{sig.walletCount} wallets</span>
            </div>
            <div className="signal-token">
              <span className="signal-symbol">{sig.token.symbol}</span>
              <span className="signal-name">{sig.token.name}</span>
            </div>
            <div className="signal-price-row">
              <span className="signal-price">{formatUsd(sig.price)}</span>
              <span className={`signal-change ${sig.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                {sig.priceChange24h >= 0 ? '+' : ''}{sig.priceChange24h.toFixed(1)}%
              </span>
            </div>
            {sig.sparkline?.length >= 2 && (
              <div className="signal-sparkline">
                <Sparkline data={sig.sparkline} width={240} height={40} />
              </div>
            )}
            <div className="signal-footer">
              {sig.walletCount} smart wallets holding
            </div>
            <div className="signal-meta">
              {sig.totalHolders != null && (
                <span className="signal-meta-item">{sig.totalHolders.toLocaleString()} holders</span>
              )}
              {sig.tokenAge != null && (
                <span className="signal-meta-item">{formatTokenAge(sig.tokenAge)}</span>
              )}
            </div>
            <div className="signal-wallets">
              {sig.wallets.slice(0, 5).map((addr, j) => {
                const w = wallets.find(wl => wl.address === addr);
                return (
                  <button
                    key={j}
                    className="signal-wallet-chip"
                    onClick={() => w && onSelectWallet(w)}
                    title={addr}
                  >
                    {shortAddr(addr)}
                  </button>
                );
              })}
              {sig.wallets.length > 5 && (
                <span className="signal-wallet-more">+{sig.wallets.length - 5}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
