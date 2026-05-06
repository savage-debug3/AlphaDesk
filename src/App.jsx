import { useState, useCallback, useMemo, useEffect } from 'react';
import { DEMO_WALLETS, DEMO_SIGNALS, DEMO_FEED } from './data/demoData.js';
import { createBirdeyeClient } from './services/birdeye.js';
import { runLivePipeline } from './services/dataPipeline.js';
import Header from './components/Header.jsx';
import ModeBanner from './components/ModeBanner.jsx';
import SignalsPanel from './components/SignalsPanel.jsx';
import LeaderboardTab from './components/LeaderboardTab.jsx';
import FeedTab from './components/FeedTab.jsx';
import SignalsDetailTab from './components/SignalsDetailTab.jsx';
import WalletDrawer from './components/WalletDrawer.jsx';
import AlphaScoreExplainer from './components/AlphaScoreExplainer.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Footer from './components/Footer.jsx';
import OverlapTab from './components/OverlapTab.jsx';
import WatchlistTab from './components/WatchlistTab.jsx';

const WATCHLIST_KEY = 'alphadesk_watchlist';

function loadWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveWatchlist(addresses) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(addresses)); } catch {}
}

const STORAGE_KEY = 'alphadesk_cache';

function loadCachedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.timestamp || 0) > 3600000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return Array.isArray(parsed.wallets) && Array.isArray(parsed.signals) && Array.isArray(parsed.feed) ? parsed : null;
  } catch {
    return null;
  }
}

const STEPS = [
  'Fetching trending tokens\u2026',
  'Scanning top traders\u2026',
  'Discovering unique wallets\u2026',
  'Enriching wallet profiles\u2026',
  'Fetching price data\u2026',
  'Running security checks\u2026',
  'Computing AlphaScores\u2026',
  'Done!',
];

export default function App() {
  const cached = useMemo(() => loadCachedData(), []);
  const [mode, setMode] = useState(cached ? 'live' : 'demo');
  const [userApiKey, setUserApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState([]);
  const [wallets, setWallets] = useState(cached ? cached.wallets : DEMO_WALLETS);
  const [signals, setSignals] = useState(cached ? cached.signals : DEMO_SIGNALS);
  const [feed, setFeed] = useState(cached ? cached.feed : DEMO_FEED);
  const [selectedWallet, setSelectedWallet] = useState(() => {
    const hash = window.location.hash.slice(1);
    if (hash && hash.length > 20) {
      const initialWallets = cached ? cached.wallets : DEMO_WALLETS;
      const found = initialWallets.find(w => w.address === hash);
      if (found) return found;
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [lastRefresh, setLastRefresh] = useState(cached ? cached.timestamp : null);
  const [error, setError] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [meta, setMeta] = useState(cached ? cached.meta : null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [watchlist, setWatchlist] = useState(() => loadWatchlist());

  const toggleWatchlist = useCallback((address) => {
    setWatchlist(prev => {
      const next = prev.includes(address)
        ? prev.filter(a => a !== address)
        : [...prev, address];
      saveWatchlist(next);
      return next;
    });
  }, []);

  const dataSource = useMemo(() => {
    if (mode === 'demo') return 'Demo Snapshot';
    if (userApiKey?.trim()) return 'Live via User Key';
    return 'Live via Proxy';
  }, [mode, userApiKey]);

  const doLiveFetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const steps = STEPS.map(label => ({ label, done: false }));
    setLoadingSteps(steps);

    const client = createBirdeyeClient({ mode: 'live', userApiKey });
    const startTime = Date.now();

    try {
      const result = await runLivePipeline(client, (idx) => {
        setLoadingSteps(prev => prev.map((s, i) => ({ ...s, done: i < idx })));
      });

      setWallets(result.wallets);
      setSignals(result.signals);
      setFeed(result.feed);
      setMeta({ ...result.meta, durationMs: Date.now() - startTime });
      setLastRefresh(Date.now());

      const hash = window.location.hash.slice(1);
      if (hash && hash.length > 20) {
        const found = result.wallets.find(w => w.address === hash);
        if (found) setSelectedWallet(found);
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          wallets: result.wallets,
          signals: result.signals,
          feed: result.feed,
          meta: { ...result.meta, durationMs: Date.now() - startTime },
          timestamp: Date.now(),
        }));
      } catch { /* quota exceeded, ignore */ }

      setLoadingSteps(prev => prev.map(s => ({ ...s, done: true })));
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      setError(err.message || 'Failed to load live data');
    } finally {
      setIsLoading(false);
    }
  }, [userApiKey]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setError(null);
    setSelectedWallet(null);
    if (newMode === 'demo') {
      setWallets(DEMO_WALLETS);
      setSignals(DEMO_SIGNALS);
      setFeed(DEMO_FEED);
      setLastRefresh(null);
      setMeta(null);
      setAutoRefreshInterval(null);
    } else {
      setWallets([]);
      setSignals([]);
      setFeed([]);
      setLastRefresh(null);
      setMeta(null);
      doLiveFetch();
    }
  }, [doLiveFetch]);

  const handleRefresh = useCallback(async () => {
    if (mode === 'demo') {
      setWallets(DEMO_WALLETS);
      setSignals(DEMO_SIGNALS);
      setFeed(DEMO_FEED);
      return;
    }
    await doLiveFetch();
  }, [mode, doLiveFetch]);

  const handleUseDemoData = useCallback(() => {
    setError(null);
    handleModeChange('demo');
  }, [handleModeChange]);

  useEffect(() => {
    if (selectedWallet) {
      window.history.replaceState(null, '', '#' + selectedWallet.address);
    } else {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [selectedWallet]);

  useEffect(() => {
    if (!autoRefreshInterval || mode !== 'live') return;
    const id = setInterval(() => {
      if (!isLoading) handleRefresh();
    }, autoRefreshInterval);
    return () => clearInterval(id);
  }, [autoRefreshInterval, mode, isLoading, handleRefresh]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (!isLoading && e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleRefresh();
      }
      if (e.key === 'd' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleModeChange('demo');
      }
      if (e.key === 'l' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleModeChange('live');
      }
      if (e.key === '1') setActiveTab('leaderboard');
      if (e.key === '2') setActiveTab('feed');
      if (e.key === '3') setActiveTab('signals');
      if (e.key === '4') setActiveTab('overlap');
      if (e.key === '5') setActiveTab('watchlist');
      if (e.key === 'w' && !e.metaKey && !e.ctrlKey && selectedWallet) {
        e.preventDefault();
        toggleWatchlist(selectedWallet.address);
      }
      if (e.key === '?' && !e.metaKey) setShowShortcuts(prev => !prev);
      if (e.key === 'Escape') { setShowShortcuts(false); setShowExplainer(false); setSelectedWallet(null); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh, handleModeChange, isLoading, toggleWatchlist, selectedWallet]);

  return (
    <div className="app">
      <Header
        mode={mode}
        setMode={handleModeChange}
        userApiKey={userApiKey}
        setUserApiKey={setUserApiKey}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        lastRefresh={lastRefresh}
        dataSource={dataSource}
        onShowExplainer={() => setShowExplainer(true)}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
      />
      <ModeBanner
        mode={mode}
        dataSource={dataSource}
        error={error}
        onRetry={handleRefresh}
        onUseDemoData={handleUseDemoData}
      />
      <div className="layout">
        <SignalsPanel
          signals={signals}
          wallets={wallets}
          onSelectWallet={setSelectedWallet}
        />
        <div className="main-panel">
          <div className="tab-bar">
            {['leaderboard', 'feed', 'signals', 'overlap', 'watchlist'].map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
            {meta && (
              <span className="tab-meta">
                {meta.endpointsUsed} API calls &middot; {meta.tokensScanned} tokens &middot; {meta.walletsEnriched} wallets
                {meta.durationMs && ` \u00B7 ${(meta.durationMs / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>
          <div className="tab-content">
            {activeTab === 'leaderboard' && (
              <LeaderboardTab
                wallets={wallets}
                onSelectWallet={setSelectedWallet}
                copiedAddress={copiedAddress}
                setCopiedAddress={setCopiedAddress}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
              />
            )}
            {activeTab === 'feed' && (
              <FeedTab feed={feed} />
            )}
            {activeTab === 'signals' && (
              <SignalsDetailTab
                signals={signals}
                wallets={wallets}
                onSelectWallet={setSelectedWallet}
              />
            )}
            {activeTab === 'overlap' && (
              <OverlapTab wallets={wallets} onSelectWallet={setSelectedWallet} />
            )}
            {activeTab === 'watchlist' && (
              <WatchlistTab
                wallets={wallets}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onSelectWallet={setSelectedWallet}
                copiedAddress={copiedAddress}
                setCopiedAddress={setCopiedAddress}
              />
            )}
          </div>
        </div>
        {selectedWallet && (
          <WalletDrawer
            wallet={selectedWallet}
            onClose={() => setSelectedWallet(null)}
            feed={feed}
            copiedAddress={copiedAddress}
            setCopiedAddress={setCopiedAddress}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
          />
        )}
      </div>
      <Footer />
      <LoadingScreen isLoading={isLoading} steps={loadingSteps} />
      {showExplainer && <AlphaScoreExplainer onClose={() => setShowExplainer(false)} />}
      {showShortcuts && (
        <div className="explainer-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="explainer-modal shortcuts-modal" onClick={e => e.stopPropagation()}>
            <div className="explainer-header">
              <span className="explainer-title">Keyboard Shortcuts</span>
              <button className="drawer-close" onClick={() => setShowShortcuts(false)}>{'\u2715'}</button>
            </div>
            <div className="explainer-body">
              <div className="shortcut-grid">
                {[
                  ['R', 'Refresh data'],
                  ['D', 'Switch to Demo'],
                  ['L', 'Switch to Live'],
                  ['1', 'Leaderboard tab'],
                  ['2', 'Feed tab'],
                  ['3', 'Signals tab'],
                  ['4', 'Overlap tab'],
                  ['5', 'Watchlist tab'],
                  ['W', 'Toggle watchlist'],
                  ['?', 'Toggle shortcuts'],
                  ['Esc', 'Close panels'],
                ].map(([key, desc]) => (
                  <div key={key} className="shortcut-row">
                    <kbd className="shortcut-key">{key}</kbd>
                    <span className="shortcut-desc">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
