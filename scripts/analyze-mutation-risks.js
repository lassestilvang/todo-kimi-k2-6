#!/usr/bin/env node
/**
 * Mutation Risk Analyzer
 * Analyzes Stryker mutation test results to identify fragile code areas
 */

const fs = require('fs');
const path = require('path');

function analyzeMutationResults(resultsPath) {
  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    const fragileFiles = [];
    const fileScores = [];

    for (const [filePath, fileData] of Object.entries(results.mutationResults.files)) {
      const { summary } = fileData;
      const survivalRate = summary.survivalRate || (summary.totalMutants ?
        (summary.totalMutants - summary.totalKilled) / summary.totalMutants : 0);

      fileScores.push({
        file: filePath,
        survivalRate: survivalRate * 100,
        totalMutants: summary.totalMutants,
        killed: summary.totalKilled,
        survivalCount: summary.totalMutants - summary.totalKilled
      });

      // Mark as fragile if survival rate > 20%
      if (survivalRate > 0.2) {
        fragileFiles.push({
          file: filePath,
          survivalRate: survivalRate * 100,
          reasons: getSurvivalReasons(fileData.mutations)
        });
      }
    }

    // Sort by survival rate descending
    fragileFiles.sort((a, b) => b.survivalRate - a.survivalRate);

    const report = {
      timestamp: new Date().toISOString(),
      globalStats: {
        ...results.mutationResults.global,
        survivalRate: results.mutationResults.global.survivalRate * 100
      },
      fragileFiles: fragileFiles,
      fileScores: fileScores,
      recommendations: generateRecommendations(fragileFiles)
    };

    // Write detailed report
    fs.writeFileSync('reports/mutation-risk-analysis.json', JSON.stringify(report, null, 2));

    // Write summary for CI/CD
    const summaryReport = {
      mutationScore: report.globalStats.mutationScore,
      fragileFileCount: fragileFiles.length,
      mostFragileFile: fragileFiles[0] ? fragileFiles[0].file : null,
      timestamp: report.timestamp
    };

    fs.writeFileSync('reports/mutation-summary.json', JSON.stringify(summaryReport, null, 2));

    console.log('✅ Mutation risk analysis complete');
    console.log(`   Mutation Score: ${report.globalStats.mutationScore}%`);
    console.log(`   Fragile Files: ${fragileFiles.length}`);

    return report;
  } catch (error) {
    console.error('❌ Mutation risk analysis failed:', error.message);
    process.exit(1);
  }
}

function getSurvivalReasons(mutations) {
  const reasons = [];
  mutations.forEach(mut => {
    if (!mut.killed) {
      reasons.push(`Mutation "${mut.operator}" at line ${mut.source.split(':')[1]} survived`);
    }
  });
  return reasons;
}

function generateRecommendations(fragileFiles) {
  const recommendations = [];

  if (fragileFiles.length > 0) {
    recommendations.push('Consider adding more unit tests for files with high mutation survival rates');
    recommendations.push('Review business logic in fragile files for edge cases');

    const highRiskFiles = fragileFiles.filter(f => f.survivalRate > 50);
    if (highRiskFiles.length > 0) {
      recommendations.push(`High risk files detected: ${highRiskFiles.map(f => f.file).join(', ')}`);
    }
  } else {
    recommendations.push('Excellent mutation score! No fragile files detected.');
  }

  return recommendations;
}

// If script is run directly
if (require.main === module) {
  const resultsPath = process.argv[2] || './reports/mutation-report.json';
  analyzeMutationResults(resultsPath);
}

module.exports = { analyzeMutationResults };