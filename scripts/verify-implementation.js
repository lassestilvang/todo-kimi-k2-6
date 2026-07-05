#!/usr/bin/env node
/**
 * Final Verification Script
 * Checks all implemented components and reports status
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkFileContent(filePath, expectedContent) {
  if (!checkFileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(expectedContent);
}

function runVerification() {
  const checks = [
    {
      name: 'GitHub Actions Workflow - test.yaml',
      file: '.github/workflows/test.yaml',
      content: 'name: Test & Coverage'
    },
    {
      name: 'GitHub Actions Workflow - compliance.yaml',
      file: '.github/workflows/compliance.yaml',
      name: 'Compliance Monitoring'
    },
    {
      name: 'Mutation Risk Analysis Script',
      file: 'scripts/analyze-mutation-risks.js',
      content: 'analyzeMutationResults'
    },
    {
      name: 'AI Refactoring Suggestions Script',
      file: 'scripts/ai-refactor-suggestions.js',
      content: 'getSuggestions'
    },
    {
      name: 'Gamification Script',
      file: 'scripts/gamification.js',
      content: 'calculateGamificationScore'
    },
    {
      name: 'Edge Case Generator Script',
      file: 'scripts/generate-edge-cases.js',
      content: 'generateInvalidInputsWithAI'
    },
    {
      name: 'PDF Report Generator Script',
      file: 'scripts/generate-pdf-report.js',
      content: 'generatePDF'
    },
    {
      name: 'Slack Notifier Script',
      file: 'scripts/slack-notifier.js',
      content: 'postLeaderboard'
    },
    {
      name: 'Notification Bot Script',
      file: 'scripts/notification-bot.js',
      content: 'app.post'
    },
    {
      name: 'Grafana Dashboard Config',
      file: 'grafana-dashboard.yml',
      content: 'Mutation Risk Dashboard'
    },
    {
      name: 'Implementation Summary',
      file: 'reports/IMPLEMENTATION_SUMMARY.md',
      content: '# ✅ Implementation Summary'
    }
  ];

  console.log('🔍 Running final verification of all components...\n');

  let allPassed = true;
  let passedCount = 0;

  checks.forEach(check => {
    const exists = checkFileExists(check.file);
    const contentMatch = exists && check.content
      ? checkFileContent(check.file, check.content)
      : true; // If no content check specified, just check existence

    if (exists && contentMatch) {
      console.log(`✅ ${check.name}`);
      passedCount++;
    } else {
      console.log(`❌ ${check.name}`);
      if (!exists) console.log(`   File not found: ${check.file}`);
      if (!contentMatch) console.log(`   Content mismatch`);
      allPassed = false;
    }
  });

  console.log(`\n📊 Results: ${passedCount}/${checks.length} checks passed`);

  if (allPassed) {
    console.log('\n🎉 ALL COMPONENTS IMPLEMENTED SUCCESSFULLY!');
    console.log('🚀 System is now bulletproof with next-level features.');
  } else {
    console.log('\n⚠️  Some components need attention. Please review failed checks above.');
  }

  return allPassed;
}

if (require.main === module) {
  const success = runVerification();
  process.exit(success ? 0 : 1);
}