import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');
const versionSourcePath = path.resolve('app', 'version.ts');
const buildDate = new Date().toISOString();

function readAppVersion(source) {
  const match = source.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return match?.[1] || 'unknown';
}

function injectHead(html, content) {
  if (html.includes('name="melisa-build-version"')) return html;
  return html.replace('</head>', `${content}\n  </head>`);
}

if (!existsSync(indexPath)) {
  throw new Error(`Web export bulunamadi: ${indexPath}`);
}

const [html, versionSource] = await Promise.all([
  readFile(indexPath, 'utf8'),
  readFile(versionSourcePath, 'utf8'),
]);
const appVersion = readAppVersion(versionSource);
const buildInfo = {
  app: 'melisa-terminal-app',
  version: appVersion,
  buildDate,
  basePath: '/melisa-terminal-app/',
};

const metaBlock = [
  '    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />',
  '    <meta http-equiv="Pragma" content="no-cache" />',
  '    <meta http-equiv="Expires" content="0" />',
  `    <meta name="melisa-build-version" content="${appVersion}" />`,
  `    <meta name="melisa-build-date" content="${buildDate}" />`,
].join('\n');

await Promise.all([
  writeFile(indexPath, injectHead(html, metaBlock), 'utf8'),
  writeFile(path.join(distDir, 'build-info.json'), `${JSON.stringify(buildInfo, null, 2)}\n`, 'utf8'),
  writeFile(path.join(distDir, '.nojekyll'), '', 'utf8'),
]);

console.log(`GitHub Pages web export hazir: v${appVersion} ${buildDate}`);
