import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PENDING_LOCATION_HASH_SESSION_KEY = "portfolio-pending-hash";

const PRESERVE_INITIAL_LOCATION_HASH_SCRIPT = `(function(){var KEY="${PENDING_LOCATION_HASH_SESSION_KEY}";function rememberHash(hash){if(hash)sessionStorage.setItem(KEY,hash);}rememberHash(location.hash);function normalizePathname(pathname){var trimmed=pathname.replace(/\\/+$/,"");return trimmed===""?"/":trimmed;}function preserveHashInHistoryUrl(url){if(typeof url!=="string")return url;try{var next=new URL(url,location.origin);if(next.hash){rememberHash(next.hash);return url;}var currentHash=location.hash;if(!currentHash)return url;if(normalizePathname(location.pathname)===normalizePathname(next.pathname)){return next.pathname+next.search+currentHash;}}catch(e){}return url;}var origReplace=history.replaceState.bind(history);history.replaceState=function(state,title,url){return origReplace(state,title,preserveHashInHistoryUrl(url));};var origPush=history.pushState.bind(history);history.pushState=function(state,title,url){return origPush(state,title,preserveHashInHistoryUrl(url));};})();`;

const SCRIPT_TAG = `<script>${PRESERVE_INITIAL_LOCATION_HASH_SCRIPT}</script>`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../out");

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

function injectPreserver(html) {
  const htmlTagMatch = /(<html[^>]*>)/i.exec(html);
  if (!htmlTagMatch) {
    return html;
  }
  const htmlOpenTag = htmlTagMatch[1];
  const insertAt = htmlTagMatch.index + htmlOpenTag.length;
  if (html.slice(insertAt).startsWith(SCRIPT_TAG)) {
    return html;
  }
  return `${html.slice(0, insertAt)}${SCRIPT_TAG}${html.slice(insertAt)}`;
}

async function main() {
  const htmlFiles = await collectHtmlFiles(OUT_DIR);
  await Promise.all(
    htmlFiles.map(async (filePath) => {
      const html = await readFile(filePath, "utf8");
      const nextHtml = injectPreserver(html);
      if (nextHtml !== html) {
        await writeFile(filePath, nextHtml, "utf8");
      }
    })
  );
}

await main();
