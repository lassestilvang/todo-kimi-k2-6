#!/usr/bin/env node
/**
 * AI-Driven Edge Case Injection Generator
 * Uses OpenAI/Anthropic to generate invalid inputs for proactive testing.
 * Production mode: Set OPENAI_API_KEY environment variable.
 */

const fs = require('fs');
const path = require('path');

async function generateInvalidInputsWithAI() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set. Using mock data.');
    return generateMockInvalidInputs();
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
            content: 'Generate invalid test inputs for a task management system. Return JSON with arrays: invalidDates, invalidNumbers, maliciousStrings, edgeCaseObjects.'
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;

    return JSON.parse(content);
  } catch (error) {
    console.error('AI generation failed, falling back to mock data:', error.message);
    return generateMockInvalidInputs();
  }
}

function generateMockInvalidInputs() {
  return {
    invalidDates: [
      '2026-02-30',
      '2023-13-01',
      '2025-00-00',
      'not-a-date',
      ''
    ],
    invalidNumbers: [
      '-Infinity',
      'NaN',
      '9999999999999999999999',
      '0xFF'
    ],
    maliciousStrings: [
      '',
      '     ',
      'null',
      '<script>alert("xss")</script>',
      '${process.exit()}'
    ],
    edgeCaseObjects: [
      {},
      { 'key': 'value' },
      { 'invalid-key$': 'value' }
    ]
  };
}

async function main() {
  const invalidInputs = await generateInvalidInputsWithAI();

  fs.writeFileSync(
    path.join(__dirname, 'invalid-inputs.json'),
    JSON.stringify(invalidInputs, null, 2)
  );

  console.log('✅ Generated synthetic invalid inputs in invalid-inputs.json');
}

if (require.main === module) {
  main();
}

module.exports = { generateInvalidInputsWithAI, generateMockInvalidInputs };