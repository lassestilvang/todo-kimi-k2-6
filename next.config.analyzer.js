const BundleAnalyzer = require('@next/bundle-analyzer')({
  analysisMode: 'static',
  reportFilename: 'bundle-analysis.html',
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
module.exports = BundleAnalyzer({});