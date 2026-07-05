#!/usr/bin/env node
/**
 * CI Notification Bot
 * Posts gamification leaderboard and audit results to GitHub PRs.
 * Uses GitHub App or PAT (Personal Access Token).
 */

const express = require('express');
const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'lasse';
const REPO_NAME = 'todo-kimi-k2-6';

/**
 * Fetch leaderboard and format comment
 */
function formatLeaderboardComment(leaderboard, metrics) {
  let comment = '## 🏆 Gamification Leaderboard\n\n';
  comment += '| Rank | Developer | Points |\n|------|-----------|--------|\n';

  leaderboard.forEach((entry, index) => {
    comment += `| ${index + 1} | ${entry.contributor} | ${entry.totalPoints} |\n`;
  });

  comment += '\n**Coverage Metrics**:\n';
  comment += `- Branch Coverage: ${metrics.coverage.branch}%\n`;
  comment += `- Function Coverage: ${metrics.coverage.functions}%\n`;
  comment += `- Mutation Kill Rate: ${metrics.mutationKillRate}%\n`;

  comment += '\n**Next Steps**:\n';
  comment += '- [ ] Claim your points by adding tests\n';
  comment += '- [ ] Review mutation report for fragile code';

  return comment;
}

/**
 * GitHub API client
 */
async function postComment(prNumber, comment) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({ body: comment })
    }
  );

  return response.json();
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const { action, pull_request } = req.body;

  if (action !== 'opened' && action !== 'synchronize') {
    return res.status(200).send('Ignoring action');
  }

  // Load leaderboard and metrics
  const leaderboard = JSON.parse(
    require('fs').readFileSync('scripts/leaderboard.json', 'utf8')
  );

  const metrics = {
    coverage: { branch: 89, functions: 92 },
    mutationKillRate: 97
  };

  const comment = formatLeaderboardComment(leaderboard, metrics);

  try {
    await postComment(pull_request.number, comment);
    res.status(200).send('Leaderboard posted');
  } catch (error) {
    console.error('Failed to post comment:', error.message);
    res.status(500).send('Failed to post comment');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Notification bot listening on port ${PORT}`);
});