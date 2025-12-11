#!/usr/bin/env node
/**
 * Patch online-3d-viewer to use local WASM files instead of CDN
 * 
 * This script replaces the jsdelivr CDN URL with local /libs/ path so that
 * occt-import-js files are loaded locally.
 * 
 * Run automatically via npm postinstall hook.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname, 
  '../node_modules/online-3d-viewer/build/engine/o3dv.module.js'
);

const cdnUrl = "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.22/dist/";
const localUrl = "location.origin + '/libs/'";

try {
  if (!fs.existsSync(filePath)) {
    console.log('online-3d-viewer not installed, skipping patch');
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes(cdnUrl)) {
    // Ersetze CDN URL mit lokaler URL (mit location.origin für absolute Pfade)
    content = content.replace(
      `let baseUrl = '${cdnUrl}'`,
      `let baseUrl = ${localUrl}`
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Patched online-3d-viewer to use local WASM files');
  } else if (content.includes("location.origin + '/libs/'")) {
    console.log('✓ online-3d-viewer already patched');
  } else {
    console.warn('⚠ Could not find CDN URL to patch - library version may have changed');
  }
} catch (err) {
  console.error('Error patching online-3d-viewer:', err.message);
  process.exit(1);
}
