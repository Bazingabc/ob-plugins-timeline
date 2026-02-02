#!/usr/bin/env node

/**
 * Copy build artifacts to Obsidian vault plugins directory
 * Usage: node copy-to-vault.js <vault-path>
 * Example: node copy-to-vault.js "/Users/bazinga/Documents/Obsidian Vault/notes"
 */

const fs = require('fs');
const path = require('path');

// Get vault path from command line argument or use environment variable
const vaultPath = process.argv[2] || process.env.OBSIDIAN_VAULT;

if (!vaultPath) {
  console.error('Error: Vault path not provided!');
  console.error('');
  console.error('Usage:');
  console.error('  node copy-to-vault.js "/path/to/your/vault"');
  console.error('');
  console.error('Or set OBSIDIAN_VAULT environment variable:');
  console.error('  export OBSIDIAN_VAULT="/path/to/your/vault"');
  console.error('  node copy-to-vault.js');
  process.exit(1);
}

const pluginsDir = path.join(vaultPath, '.obsidian', 'plugins', 'obsidian-timeline');

// Files to copy
const filesToCopy = [
  { src: 'main.js', dest: 'main.js' },
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'style.css', dest: 'style.css' },
];

console.log('Copying build artifacts to Obsidian vault...');
console.log('Source:', __dirname);
console.log('Destination:', pluginsDir);
console.log('');

// Create plugins directory if it doesn't exist
if (!fs.existsSync(pluginsDir)) {
  fs.mkdirSync(pluginsDir, { recursive: true });
  console.log('Created directory:', pluginsDir);
}

// Copy each file
let copiedCount = 0;
filesToCopy.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, src);
  const destPath = path.join(pluginsDir, dest);

  if (!fs.existsSync(srcPath)) {
    console.error('⚠️  Source file not found:', src);
    return;
  }

  try {
    fs.copyFileSync(srcPath, destPath);
    console.log('✓ Copied:', src, '→', path.join('.obsidian/plugins/obsidian-timeline', dest));
    copiedCount++;
  } catch (err) {
    console.error('✗ Failed to copy:', src, '-', err.message);
  }
});

console.log('');
console.log('Done! Copied', copiedCount, 'of', filesToCopy.length, 'files.');
console.log('');
console.log('Restart Obsidian or reload the plugin to see changes.');
