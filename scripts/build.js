// Build script — produces a static ./dist folder ready for GitHub Pages.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

copyRecursive(path.join(root, "index.html"), path.join(distDir, "index.html"));
copyRecursive(path.join(root, "src"), path.join(distDir, "src"));
copyRecursive(path.join(root, "manifest.webmanifest"), path.join(distDir, "manifest.webmanifest"));
copyRecursive(path.join(root, "sw.js"), path.join(distDir, "sw.js"));
copyRecursive(path.join(root, "icons"), path.join(distDir, "icons"));

console.log("Build complete: dist/ is ready (app, manifest, service worker, icons).");
