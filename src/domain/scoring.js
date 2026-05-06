import { getTier } from '../utils/formatters.js';

export function computeAlphaScore(wallet) {
  const coverage = wallet.appearsInTokens?.length || 0;
  const coverageScore = Math.min(30, (coverage / 10) * 30);

  const hoursSinceLastTrade = (Date.now() - (wallet.lastTradeTimestamp || Date.now())) / 3600000;
  let recencyScore = 0;
  let recencyDetail = 'Inactive >72h';
  if (hoursSinceLastTrade < 6) { recencyScore = 20; recencyDetail = 'Active <6h'; }
  else if (hoursSinceLastTrade < 24) { recencyScore = 12; recencyDetail = 'Active <24h'; }
  else if (hoursSinceLastTrade < 72) { recencyScore = 4; recencyDetail = 'Active <72h'; }

  const positions = wallet.positions || wallet.currentPositions || [];
  const tokenCount = positions.length;
  let diversityScore = 4;
  let diversityDetail = `${tokenCount} positions (narrow)`;
  if (tokenCount >= 3 && tokenCount <= 15) { diversityScore = 15; diversityDetail = `${tokenCount} positions (balanced)`; }
  else if (tokenCount > 15) { diversityScore = 8; diversityDetail = `${tokenCount} positions (broad)`; }

  const highRiskCount = positions.filter(p => p.securityRisk === 'HIGH').length;
  const medRiskCount = positions.filter(p => p.securityRisk === 'MEDIUM').length;
  const qualityPenalty = Math.min(10, highRiskCount * 3 + medRiskCount);
  const qualityScore = Math.max(0, 10 - qualityPenalty);

  let eliteBonus = 0;
  let eliteDetail = 'Standard';
  if (coverage >= 5) { eliteBonus = 10; eliteDetail = 'Appears in 5+ trending tokens'; }
  else if (coverage >= 3) { eliteBonus = 5; eliteDetail = 'Appears in 3+ trending tokens'; }

  let profitScore = 0;
  let profitDetail = 'No PnL data';
  const pnl = wallet.walletPnl;
  if (pnl) {
    const totalPnl = pnl.totalPnl || 0;
    if (totalPnl > 10000) { profitScore = 15; profitDetail = `PnL $${Math.round(totalPnl).toLocaleString()}`; }
    else if (totalPnl > 1000) { profitScore = 12; profitDetail = `PnL $${Math.round(totalPnl).toLocaleString()}`; }
    else if (totalPnl > 0) { profitScore = 8; profitDetail = `PnL $${Math.round(totalPnl).toLocaleString()}`; }
    else if (totalPnl > -1000) { profitScore = 3; profitDetail = `PnL -$${Math.abs(Math.round(totalPnl)).toLocaleString()}`; }
    else { profitScore = 0; profitDetail = `PnL -$${Math.abs(Math.round(totalPnl)).toLocaleString()}`; }
  }

  const total = Math.min(100, Math.round(coverageScore + recencyScore + diversityScore + qualityScore + eliteBonus + profitScore));
  const tier = getTier(total);

  return {
    total,
    tier,
    breakdown: {
      coverage: { score: Math.round(coverageScore), max: 30, detail: `${coverage} trending tokens` },
      recency: { score: Math.round(recencyScore), max: 20, detail: recencyDetail },
      diversity: { score: Math.round(diversityScore), max: 15, detail: diversityDetail },
      quality: { score: Math.round(qualityScore), max: 10, detail: highRiskCount + medRiskCount > 0 ? `${highRiskCount} high risk, ${medRiskCount} medium risk tokens` : 'No high-risk tokens' },
      elite: { score: Math.round(eliteBonus), max: 10, detail: eliteDetail },
      profitability: { score: Math.round(profitScore), max: 15, detail: profitDetail },
    },
  };
}
