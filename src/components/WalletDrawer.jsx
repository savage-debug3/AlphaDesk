import { useEffect, useRef } from 'react';
import { shortAddr, formatUsd, formatNumber, timeAgo, getTier, getTierColor, getTierDimColor } from '../utils/formatters.js';
import Sparkline from './Sparkline.jsx';

export default function WalletDrawer({ wallet, onClose, feed, copiedAddress, setCopiedAddress, watchlist, onToggleWatchlist }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!wallet) return null;

  const tier = wallet.tier || getTier(wallet.alphaScore);
  const tierColor = getTierColor(tier);
  const tierDim = getTierDimColor(tier);
  const walletFeed = feed ? feed.filter(t => t.wallet === wallet.address).slice(0, 5) : [];
  const breakdown = wallet.scoreBreakdown;

  function copyFullAddr() {
    navigator.clipboard.writeText(wallet.address).catch(() => {});
    setCopiedAddress(wallet.address);
    setTimeout(() => setCopiedAddress(null), 1500);
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} ref={overlayRef} />
      <div className="wallet-drawer">
        <div className="drawer-header">
          <div className="drawer-title-row">
            <span className="drawer-addr">{shortAddr(wallet.address)}</span>
            <span className="tier-badge" style={{ background: tierDim, color: tierColor }}>{tier}</span>
            <button
              className={`star-btn drawer-star ${watchlist?.includes(wallet.address) ? 'starred' : ''}`}
              onClick={() => onToggleWatchlist(wallet.address)}
              title={watchlist?.includes(wallet.address) ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {watchlist?.includes(wallet.address) ? '★' : '☆'}
            </button>
            <button className="drawer-close" onClick={onClose}>{'\u2715'}</button>
          </div>
          <div className="drawer-full-addr" onClick={copyFullAddr} title="Click to copy">
            {wallet.address}
            {copiedAddress === wallet.address && <span className="copied-tip">Copied!</span>}
            <a
              href={`https://solscan.io/account/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="solscan-link"
              onClick={(e) => e.stopPropagation()}
              title="View on Solscan"
            >
              ↗
            </a>
          </div>
        </div>

        <div className="drawer-stats">
          <div className="drawer-stat">
            <div className="drawer-stat-label">AlphaScore</div>
            <div className="drawer-stat-value">
              <div className="score-bar-container" style={{ width: 100 }}>
                <div className="score-bar" style={{ width: wallet.alphaScore + '%', background: tierColor }} />
              </div>
              <span style={{ color: tierColor, fontFamily: 'var(--font-mono)' }}>{wallet.alphaScore}</span>
            </div>
          </div>
          <div className="drawer-stat">
            <div className="drawer-stat-label">Portfolio</div>
            <div className="drawer-stat-value mono">{formatUsd(wallet.portfolio)}</div>
          </div>
          <div className="drawer-stat">
            <div className="drawer-stat-label">Tokens Held</div>
            <div className="drawer-stat-value mono">{wallet.positions?.length || 0}</div>
          </div>
          {wallet.totalPnl != null && wallet.totalPnl !== 0 && (
            <div className="drawer-stat">
              <div className="drawer-stat-label">24h PnL</div>
              <div className={`drawer-stat-value mono ${wallet.totalPnl >= 0 ? 'positive' : 'negative'}`}>
                {wallet.totalPnl >= 0 ? '+' : ''}{formatUsd(wallet.totalPnl)}
              </div>
            </div>
          )}
          {wallet.totalTrades > 0 && (
            <div className="drawer-stat">
              <div className="drawer-stat-label">24h Trades</div>
              <div className="drawer-stat-value mono">{formatNumber(wallet.totalTrades)}</div>
            </div>
          )}
        </div>

        {breakdown && (
          <>
            <div className="drawer-section-title">Score Breakdown</div>
            <div className="drawer-breakdown">
              {Object.entries(breakdown).map(([key, val]) => (
                <div key={key} className="breakdown-row">
                  <span className="breakdown-label">{key}</span>
                  <div className="breakdown-bar-wrap">
                    <div className="breakdown-bar" style={{ width: (val.score / val.max * 100) + '%' }} />
                  </div>
                  <span className="breakdown-score">{val.score}/{val.max}</span>
                  <span className="breakdown-detail">{val.detail}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="drawer-section-title">Current Positions</div>
        <div className="drawer-positions">
          {(wallet.positions || []).map((pos, i) => (
            <div key={i} className="drawer-position">
              <div className="dp-header">
                <div className="dp-token">
                  <span className="dp-symbol">{pos.symbol}</span>
                  <span className="dp-name">{pos.name}</span>
                </div>
                {pos.sparkline?.length >= 2 && <Sparkline data={pos.sparkline} width={60} height={20} />}
              </div>
              <div className="dp-details">
                <div className="dp-price">
                  <span>{formatUsd(pos.price || (pos.uiAmount ? pos.valueUsd / pos.uiAmount : 0))}</span>
                  <span className={`dp-change ${pos.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                    {pos.priceChange24h >= 0 ? '+' : ''}{(pos.priceChange24h || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="dp-amount">
                  <span>{formatNumber(pos.uiAmount)} {pos.symbol}</span>
                  <span className="dp-value">{formatUsd(pos.valueUsd)}</span>
                </div>
              </div>
              {pos.securityRisk && pos.securityRisk !== 'LOW' && (
                <div className={`dp-risk ${pos.securityRisk.toLowerCase()}`}>
                  {pos.securityRisk} RISK
                </div>
              )}
            </div>
          ))}
        </div>

        {walletFeed.length > 0 && (
          <>
            <div className="drawer-section-title">Recent Activity</div>
            <div className="drawer-trades">
              {walletFeed.map((entry) => (
                <div key={entry.id} className="drawer-trade">
                  <span className="feed-dot top-trader" />
                  <span className="dt-action">Top trader on</span>
                  <span className="dt-token">{entry.token?.symbol || 'UNK'}</span>
                  <span className="dt-value">{entry.volume24h ? formatUsd(entry.volume24h) : ''}</span>
                  <span className="dt-time">{entry.timestamp ? timeAgo(entry.timestamp) : ''}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
