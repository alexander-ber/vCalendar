import fs from "node:fs/promises";
import path from "node:path";

const EVENTS_ROOT = "data/events";
const CACHE_DIR = "/private/tmp/harekrishnazp-event-pages";
const USER_AGENT = "Mozilla/5.0";
const HAREKRISHNAZP_ORIGIN = "http://harekrishnazp.info";
const DISTRIBUTION_NOTE =
  "Source footer says: Распространение материалов сайта горячо приветствуется! При использовании информации на других сайтах, пожалуйста, ставьте ссылку на цитируемый материал.";

function stripTags(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function articleHtml(html) {
  const match = html.match(/<div class="item-page">([\s\S]*?)<div id="jc">/);
  return match?.[1] || "";
}

function articleDescription(html) {
  const body = articleHtml(html)
    .replace(/<h2[\s\S]*?<\/h2>/i, "")
    .replace(/<div class="jcomments-links">[\s\S]*?<\/div>/gi, "");
  return stripTags(body);
}

function cacheFileForUrl(url) {
  const slug = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return path.join(CACHE_DIR, `${slug}.html`);
}

async function readCachedOrFetch(url) {
  const cachePath = cacheFileForUrl(url);
  try {
    return await fs.readFile(cachePath, "utf8");
  } catch {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const html = await response.text();
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, html);
    return html;
  }
}

async function jsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await jsonFiles(fullPath)));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(fullPath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function primaryHarekrishnazpSource(content) {
  return content.sources?.find((source) => source.url?.startsWith(HAREKRISHNAZP_ORIGIN));
}

function ensureRussianTranslation(content) {
  content.translations ||= [];
  let ru = content.translations.find((item) => item.lang === "ru");
  if (!ru) {
    ru = { lang: "ru", name: "", short_description: "", full_description: "" };
    content.translations.push(ru);
  }
  return ru;
}

async function main() {
  const files = await jsonFiles(EVENTS_ROOT);
  const byUrl = new Map();
  for (const file of files) {
    const content = JSON.parse(await fs.readFile(file, "utf8"));
    const source = primaryHarekrishnazpSource(content);
    if (!source) continue;
    if (!byUrl.has(source.url)) byUrl.set(source.url, []);
    byUrl.get(source.url).push({ file, content, source });
  }

  let updated = 0;
  const failed = [];
  for (const [url, items] of byUrl) {
    try {
      const html = await readCachedOrFetch(url);
      const fullDescription = articleDescription(html);
      if (!fullDescription) throw new Error("empty article description");
      for (const item of items) {
        const ru = ensureRussianTranslation(item.content);
        ru.full_description = fullDescription;
        item.content.content_license_note = DISTRIBUTION_NOTE;
        item.source.attribution_required = true;
        await fs.writeFile(item.file, `${JSON.stringify(item.content, null, 2)}\n`);
        updated += 1;
      }
    } catch (error) {
      failed.push({ url, error: error.message, events: items.map((item) => item.content.id) });
    }
  }

  console.log(JSON.stringify({ urls: byUrl.size, updated, failed }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
