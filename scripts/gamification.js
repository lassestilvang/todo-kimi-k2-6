#!/usr/bin/env node
/**
 * Gamification System for Code Quality
 * Tracks developer contributions and assigns points for quality metrics.
 */

const fs = require('fs');
const path = require('path');

const POINTS = {
  COVERAGE: 10,        // Points per 1% coverage above 80%
  MUTATION_KILL: 20,   // Points per 1% mutation kill rate
  NO_VIOLATIONS: 50,   // Bonus for zero compliance violations
  EDGE_CASES: 5        // Points per edge case covered
};

function calculateGamificationScore(metrics) {
  let totalPoints = 0;
  const breakdown = {};

  // Coverage points
  if (metrics.coverage && metrics.coverage.branch >= 80) {
    const coverageBonus = Math.round((metrics.coverage.branch - 80) * POINTS.COVERAGE);
    breakdown.coverage = coverageBonus;
    totalPoints += coverageBonus;
  }

  // Mutation kill rate points
  if (metrics.mutationKillRate) {
    const mutationPoints = Math.round(metrics.mutationKillRate * POINTS.MUTATION_KILL);
    breakdown.mutation = mutationPoints;
    totalPoints += mutationPoints;
  }

  // Compliance bonus
  if (metrics.violations === 0) {
    breakdown.compliance = POINTS.NO_VIOLATIONS;
    totalPoints += POINTS.NO_VIOLATIONS;
  }

  // Edge cases points
  if (metrics.edgeCases) {
    const edgePoints = metrics.edgeCases * POINTS.EDGE_CASES;
    breakdown.edgeCases = edgePoints;
    totalPoints += edgePoints;
  }

  return {
    totalPoints,
    breakdown,
    timestamp: new Date().toISOString()
  };
}

function updateLeaderboard(scoreData, contributor = 'unknown') {
  const leaderboardPath = path.join(__dirname, 'leaderboard.json');
  let leaderboard = [];

  if (fs.existsSync(leaderboardPath)) {
    leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, 'utf8'));
  }

  leaderboard.push({
    ...scoreData,
    contributor
  });

  leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

  // Keep top 10
  leaderboard = leaderboard.slice(0, 10);

  fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));

  return leaderboard;
}

// Example usage
const sampleMetrics = {
  coverage: { branch: 89 },
  mutationKillRate: 97,
  violations: 0,
  edgeCases: 50
};

const score = calculateGamificationScore(sampleMetrics);
const leaderboard = updateLeaderboard(score, 'dev-team');

console.log('🏆 Gamification Score:', score.totalPoints);
console.log('📊 Leaderboard:', leaderboard.map(l => `${l.contributor}: ${l.totalPoints} pts`));

module.exports = { calculateGamificationScore, updateLeaderboard };