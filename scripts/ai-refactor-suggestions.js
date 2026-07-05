/**
 * AI-Powered Refactoring Suggestions
 * Analyzes fragile files and suggests improvements via LLM.
 */

const fs = require('fs');
const path = require('path');

async function getSuggestions(codeSnippet, filePath) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set. Returning mock suggestions.');
    return getMockSuggestions();
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a senior engineer. Given code with high mutation survival rate, suggest improvements to make it more robust. Return JSON format: { "suggestions": ["..."], "priority": "high|medium|low" }'
          },
          {
            role: 'user',
            content: `This code has high mutation survival rate. Suggest improvements:\n\nFile: ${filePath}\n\nCode:\n${codeSnippet}`
          }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('AI refactoring failed:', error.message);
    return getMockSuggestions();
  }
}

function getMockSuggestions() {
  return {
    suggestions: [
      'Add input validation for all parameters',
      'Consider adding unit tests for edge cases',
      'Refactor complex logic into smaller functions',
      'Improve error handling for network calls',
      'Add type guards for runtime type checking'
    ],
    priority: 'medium'
  };
}

async function analyzeFragileFiles() {
  const mutationAnalysisPath = 'reportsPath = 'reports/mutation-risk-analysis.json';
  const suggestionsPath = 'reports/ai-refactor-suggestions.json';

  if (!fs.existsSync(mutationAnalysisPath)) {
    console.error('❌ Mutation analysis not found. Run analyze-mutation-risks.js first.');
    return;
  }

  const analysis = JSON.parse(fs.readFileSync(mutationAnalysisPath, 'utf8'));
  const suggestions = {};

  for (const file of analysis.fragileFiles || []) {
    console.log(`🔍 Analyzing: ${file.file}`);

    // In production, read actual file content
    let codeSnippet = '';
    try {
      const filePath = path.join(process.cwd(), file.file);
      if (fs.existsSync(filePath)) {
        codeSnippet = fs.readFileSync(filePath, 'utf8');
      } else {
        codeSnippet = `// File not found: ${file.file}`;
      }
    } catch (e) {
      codeSnippet = `// Error reading file: ${e.message}`;
    }

    const aiSuggestions = await getSuggestions(codeSnippet, file.file);

    suggestions[file.file] = {
      ...aiSuggestions,
      survivalRate: file.survivalRate,
      reasons: file.reasons
    };
  }

  fs.writeFileSync(suggestionsPath, JSON.stringify(suggestions, null, 2));
  console.log(`✅ Saved refactoring suggestions to ${suggestionsPath}`);
}

if (require.main === module) {
  analyzeFragileFiles();
}

module.exports = { getSuggestions, analyzeFragileFiles };