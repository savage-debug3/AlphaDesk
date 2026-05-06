import { useState, useMemo } from 'react';
import { shortAddr, formatUsd, timeAgo, getTier, getTierColor, getTierDimColor } from '../utils/formatters.js';

export default function WatchlistTab({ wallets, watchlist, onToggleWatchlist, onSelectWallet, copiedAddress, setCopiedAddress }) {
  const [animateScores, setAnimateScores] = useState(true);

  const watchedWallets = useMemo(() => {
    if (!wallets || !watchlist) return [];
    return watchlist
      .map(addr => wallets.find(w => w.address === addr))
      .filter(Boolean)
      .sort((a, b) => (b.alphaScore || 0) - (a.alphaScore || 0));
  }, [wallets, watchlist]);

  function copyAddr(e, addr) {
    e.stopPropagation();
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 1500);
  }

  if (watchlist.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-title">No watched wallets</span>
        <span className="empty-detail">Star wallets from the Leaderboard to track them here. Click the ☆ icon on any wallet row.</span>
      </div>
    );
  }

  if (watchedWallets.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-title">Watched wallets not in current data</span>
        <span className="empty-detail">Your {watchlist.length} watched wallet(s) weren't found in the current pipeline run. They may appear after a refresh.</span>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-toolbar">
        <span className="leaderboard-count">{watchedWallets.length} watched wallet{watchedWallets.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="leaderboard-header">
        <span className="lb-col lb-star"></span>
        <span className="lb-col lb-rank">#</span>
        <span className="lb-col lb-wallet">Wallet</span>
        <span className="lb-col lb-score">Score</span>
        <span className="lb-col lb-tokens">Tokens</span>
        <span className="lb-col lb-portfolio">Portfolio</span>
        <span className="lb-col lb-active">Last Active</span>
        <span className="lb-col lb-tier">Tier</span>
      </div>
      <div className="leaderboard-body">
        {watchedWallets.map((w, i) => {
          const tier = w.tier || getTier(w.alphaScore);
          const tierColor = getTierColor(tier);
          const tierDim = getTierDimColor(tier);
          return (
            <div
              key={w.address}
              className="leaderboard-row"
              onClick={() => onSelectWallet(w)}
              style={{ '--tier-color': tierColor }}
            >
              <span className="lb-col lb-star">
                <button
                  className="star-btn starred"
                  onClick={(e) => { e.stopPropagation(); onToggleWatchlist(w.address); }}
                  title="Remove from watchlist"
                >
                  ★
                </button>
              </span>
              <span className="lb-col lb-rank">#{i + 1}</span>
              <span className="lb-col lb-wallet">
                <button className="wallet-addr-btn" onClick={(e) => copyAddr(e, w.address)} title="Click to copy">
                  {shortAddr(w.address)}
                  {copiedAddress === w.address && <span className="copied-tip">Copied!</span>}
                </button>
                <a
                  href={`https://solscan.io/account/${w.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="solscan-link"
                  onClick={(e) => e.stopPropagation()}
                  title="View on Solscan"
                >
                  ↗
                </a>
              </span>
              <span className="lb-col lb-score">
                <div className="score-bar-container">
                  <div className="score-bar" style={{ width: animateScores ? w.alphaScore + '%' : '0%', background: tierColor }} />
                </div>
                <span className="score-num" style={{ color: tierColor }}>{w.alphaScore}</span>
              </span>
              <span className="lb-col lb-tokens">{w.positions?.length || 0}</span>
              <span className="lb-col lb-portfolio lb-mono">{formatUsd(w.portfolio)}</span>
              <span className="lb-col lb-active lb-mono">{timeAgo(w.lastActive)}</span>
              <span className="lb-col lb-tier">
                <span className="tier-badge" style={{ background: tierDim, color: tierColor }}>{tier}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
