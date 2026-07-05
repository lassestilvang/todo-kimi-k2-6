#!/usr/bin/env node
/**
 * PDF Audit Report Generator
 * Converts audit-report.html to PDF for easy sharing
 * Requires: npm install puppeteer
 */

const fs = require('fs');
const path = require('path');

async function generatePDF() {
  try {
    // Check if puppeteer is available
    const puppeteer = require('puppeteer');

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const htmlPath = path.resolve(__dirname, '../reports/audit-report.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfPath = path.resolve(__dirname, '../reports/audit-report.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();

    console.log('✅ PDF audit report generated at reports/audit-report.pdf');
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    console.log('   Note: Install puppeteer with: npm install puppeteer');
    process.exit(1);
  }
}

if (require.main === module) {
  generatePDF();
}

module.exports = { generatePDF };