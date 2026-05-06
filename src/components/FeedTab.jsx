import { shortAddr, formatUsd, formatNumber, timeAgo } from '../utils/formatters.js';

export default function FeedTab({ feed }) {
  if (!feed || feed.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-title">No activity yet</span>
        <span className="empty-detail">Feed entries are derived from live top-trader data. They will populate after a successful pipeline run.</span>
      </div>
    );
  }

  return (
    <div className="feed">
      <div className="feed-header-row">
        <span className="feed-hcol feed-hw">Wallet</span>
        <span className="feed-hcol feed-ht">Token</span>
        <span className="feed-hcol feed-hv">24h Volume</span>
        <span className="feed-hcol feed-hc">Trades</span>
        <span className="feed-hcol feed-hs">Source</span>
        <span className="feed-hcol feed-htime">Time</span>
      </div>
      {feed.map((entry) => (
        <div key={entry.id} className="feed-item">
          {entry.type === 'top_gainer' ? (
            <>
              <span className="feed-dot gainer" />
              <span className="feed-addr">{shortAddr(entry.wallet)}</span>
              <span className="feed-token">Top earner</span>
              <span className={`feed-value ${entry.pnl >= 0 ? 'positive' : 'negative'}`}>
                {entry.pnl >= 0 ? '+' : ''}{formatUsd(entry.pnl)}
              </span>
              <span className="feed-trades">{entry.tradeCount ? formatNumber(entry.tradeCount) : '\u2014'}</span>
              <span className="feed-source">{entry.source || 'Unknown'}</span>
              <span className="feed-time">{entry.timestamp ? timeAgo(entry.timestamp) : ''}</span>
            </>
          ) : (
            <>
              <span className="feed-dot top-trader" />
              <span className="feed-addr">{shortAddr(entry.wallet)}</span>
              <span className="feed-token">{entry.token?.symbol || 'UNK'}</span>
              <span className="feed-value">{entry.volume24h ? formatUsd(entry.volume24h) : '\u2014'}</span>
              <span className="feed-trades">{entry.tradeCount ? formatNumber(entry.tradeCount) : '\u2014'}</span>
              <span className="feed-source">{entry.source || 'Unknown'}</span>
              <span className="feed-time">{entry.timestamp ? timeAgo(entry.timestamp) : ''}</span>
            </>
          )}
        </div>
      ))}
      <div className="feed-disclaimer">
        Activity derived from Birdeye top trader data. Volumes are 24h aggregates, not individual trades.
      </div>
    </div>
  );
}
