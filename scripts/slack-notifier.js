#!/usr/bin/env node
/**
 * Slack Notifier for Leaderboard Updates
 * Posts weekly leaderboard winners to #engineering channel.
 */

const { WebClient } = require('@slack/web-api');

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const CHANNEL_ID = '#engineering'; // Or channel ID

if (!SLACK_TOKEN) {
  console.warn('⚠️  SLACK_BOT_TOKEN not set. Skipping Slack notification.');
  process.exit(0);
}

const slack = new WebClient(SLACK_TOKEN);

async function postLeaderboard() {
  const leaderboard = JSON.parse(
    require('fs').readFileSync('scripts/leaderboard.json', 'utf8')
  );

  const winner = leaderboard[0];
  const message = `
🏆 *Weekly Gamification Leaderboard Update*

*${winner.contributor}* takes the crown with *${winner.totalPoints} points*!

Top Contributors:
${leaderboard.slice(0, 5).map((e, i) => `${i + 1}. ${e.contributor} (${e.totalPoints} pts)`).join('\n')}

Keep up the great work, team! 🚀
  `;

  try {
    await slack.chat.postMessage({
      channel: CHANNEL_ID,
      text: message,
      mrkdwn: true
    });
    console.log('✅ Slack leaderboard posted');
  } catch (error) {
    console.error('❌ Failed to post to Slack:', error.message);
  }
}

// Run if executed directly
if (require.main === module) {
  postLeaderboard();
}

module.exports = { postLeaderboard };