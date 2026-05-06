import { useState, useEffect, useMemo } from 'react';
import { shortAddr, formatUsd, timeAgo, getTier, getTierColor, getTierDimColor } from '../utils/formatters.js';

function getSortColumns(wallets) {
  const portfolioLabel = wallets?.some(w => w.portfolioLabel) ? '24h Volume' : 'Portfolio';
  return [
    { key: 'rank', label: 'Rank', className: 'lb-rank' },
    { key: 'wallet', label: 'Wallet', className: 'lb-wallet' },
    { key: 'alphaScore', label: 'Score', className: 'lb-score' },
    { key: 'positions.length', label: 'Tokens', className: 'lb-tokens' },
    { key: 'portfolio', label: portfolioLabel, className: 'lb-portfolio' },
    { key: 'walletPnl', label: 'PnL', className: 'lb-pnl' },
    { key: 'lastActive', label: 'Last Active', className: 'lb-active' },
    { key: 'tier', label: 'Tier', className: 'lb-tier' },
  ];
}

function getSortValue(w, key) {
  if (key === 'rank' || key === 'alphaScore' || key === 'tier') return w.alphaScore || 0;
  if (key === 'positions.length') return w.positions?.length || 0;
  if (key === 'portfolio') return w.portfolio || 0;
  if (key === 'walletPnl') return w.walletPnl?.totalPnl || 0;
  if (key === 'lastActive') return w.lastActive || 0;
  if (key === 'wallet') return w.address || '';
  return 0;
}

export default function LeaderboardTab({ wallets, onSelectWallet, copiedAddress, setCopiedAddress, watchlist, onToggleWatchlist }) {
  const [animateScores, setAnimateScores] = useState(false);
  const [sortKey, setSortKey] = useState('alphaScore');
  const [sortDir, setSortDir] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setAnimateScores(true), 100);
    return () => clearTimeout(t);
  }, []);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    if (!wallets) return [];
    if (!searchQuery) return wallets;
    const q = searchQuery.toLowerCase();
    return wallets.filter(w =>
      w.address.toLowerCase().includes(q) ||
      (w.tier || getTier(w.alphaScore)).toLowerCase().includes(q)
    );
  }, [wallets, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (sortKey === 'wallet') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function handleExport() {
    const headers = ['Rank', 'Address', 'AlphaScore', 'Tier', 'Tokens', 'Portfolio_USD', 'Last_Active'];
    const rows = sorted.map((w, i) => [
      i + 1,
      w.address,
      w.alphaScore,
      w.tier || getTier(w.alphaScore),
      w.positions?.length || 0,
      w.portfolio || 0,
      w.lastActive ? new Date(w.lastActive).toISOString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alphadesk-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!wallets || wallets.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-title">Waiting for pipeline data</span>
        <span className="empty-detail">The live Birdeye pipeline is initializing. Wallets will appear here once scanning completes.</span>
      </div>
    );
  }

  function copyAddr(e, addr) {
    e.stopPropagation();
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 1500);
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-toolbar">
        <input
          className="leaderboard-search"
          type="text"
          placeholder="Search wallets or filter by tier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="leaderboard-count">{filtered.length} of {wallets.length} wallets</span>
        <button className="export-btn" onClick={handleExport} title="Export leaderboard as CSV">
          Export CSV
        </button>
      </div>
      <div className="leaderboard-header">
        <span className="lb-col lb-star"></span>
        {getSortColumns(wallets).map(col => (
          <span key={col.key} className={`lb-col ${col.className}`}>
            <button
              className={`lb-header-btn ${sortKey === col.key ? 'active' : ''}`}
              onClick={() => handleSort(col.key)}
            >
              {col.label}
              {sortKey === col.key && (
                <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
              )}
            </button>
          </span>
        ))}
      </div>
      <div className="leaderboard-body">
        {sorted.map((w, i) => {
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
                  className={`star-btn ${watchlist.includes(w.address) ? 'starred' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onToggleWatchlist(w.address); }}
                  title={watchlist.includes(w.address) ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {watchlist.includes(w.address) ? '★' : '☆'}
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
                  <div
                    className="score-bar"
                    style={{
                      width: animateScores ? w.alphaScore + '%' : '0%',
                      background: tierColor,
                    }}
                  />
                </div>
                <span className="score-num" style={{ color: tierColor }}>{w.alphaScore}</span>
              </span>
              <span className="lb-col lb-tokens">{w.positions?.length || 0}</span>
              <span className="lb-col lb-portfolio lb-mono">{formatUsd(w.portfolio)}</span>
              <span className={`lb-col lb-pnl lb-mono ${(w.walletPnl?.totalPnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                {w.walletPnl ? ((w.walletPnl.totalPnl >= 0 ? '+' : '') + formatUsd(w.walletPnl.totalPnl)) : '—'}
              </span>
              <span className="lb-col lb-active lb-mono">{timeAgo(w.lastActive)}</span>
              <span className="lb-col lb-tier">
                <span className="tier-badge" style={{ background: tierDim, color: tierColor }}>
                  {tier}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
