import fs from "node:fs/promises";
import path from "node:path";

const CALENDAR_URL =
  "http://harekrishnazp.info/189-vajshnavskij-kalendar-ekadashi/2384-tel-aviv-izrail-vajshnavskij-kalendar-ekadashi.html";
const SITE_ORIGIN = "http://harekrishnazp.info";
const OUTPUT_PATH = "data/imports/harekrishnazp-events-2026.json";
const CACHE_DIR = "/private/tmp/harekrishnazp-event-pages";
const CALENDAR_CACHE_PATH = "/private/tmp/harekrishna_telaviv.html";
const USER_AGENT = "Mozilla/5.0";

function stripTags(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
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

function absoluteUrl(href) {
  return href.startsWith("http") ? href : `${SITE_ORIGIN}${href}`;
}

function eventKind(title) {
  const lower = title.toLowerCase();
  if (lower.includes("экадаши")) return "ekadashi";
  if (lower.includes("день явления")) return "appearance";
  if (lower.includes("день ухода")) return "disappearance";
  if (lower.includes("пуджа")) return "festival";
  return "festival";
}

function eventTitleFromLine(line, linkText) {
  const clean = line
    .replace(/\s*подробнее\.\.\.\s*/gi, "")
    .replace(/^Пост на\s+/i, "")
    .replace(/\s*:\s*$/g, "")
    .trim();
  return clean || linkText;
}

function linkedEventsFromBlock(blockHtml) {
  const results = [];
  const segments = blockHtml
    .split(/<br\s*\/?>/gi)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const links = [...segment.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    for (const link of links) {
      const href = link[1];
      const linkText = stripTags(link[2]);
      const line = stripTags(segment);
      let title = eventTitleFromLine(line, linkText);
      if (/^подробнее/i.test(title) && !/^подробнее/i.test(linkText)) title = linkText;
      if (/Прервать пост/i.test(title)) continue;
      results.push({
        title,
        kind: eventKind(title),
        source_url: absoluteUrl(href)
      });
    }
  }

  return results;
}

function parseCalendar(html) {
  const rows = [...html.matchAll(/<tr>\s*<td[^>]*>(\d{1,2})\.(\d{1,2})\.(\d{4})[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td/gi)];
  const events = [];
  for (const row of rows) {
    const day = row[1].padStart(2, "0");
    const month = row[2].padStart(2, "0");
    const year = row[3];
    const blockHtml = row[4];
    for (const event of linkedEventsFromBlock(blockHtml)) {
      events.push({
        date: `${year}-${month}-${day}`,
        ...event
      });
    }
  }
  return events;
}

function articleHtml(html) {
  const match = html.match(/<div class="item-page">([\s\S]*?)<div id="jc">/);
  return match?.[1] || "";
}

function articleTitle(html) {
  const match = articleHtml(html).match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  return match ? stripTags(match[1]) : "";
}

function articleDescription(html) {
  const body = articleHtml(html)
    .replace(/<h2[\s\S]*?<\/h2>/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<img[^>]*>/gi, "");
  return stripTags(body);
}

function shortDescription(text) {
  const firstParagraph = text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 80);
  if (!firstParagraph) return text.slice(0, 420);
  return firstParagraph.length > 700 ? `${firstParagraph.slice(0, 697).trim()}...` : firstParagraph;
}

function englishFallback(eventTitle) {
  return `Imported calendar reference for "${eventTitle}". English summary still needs editorial translation; the Russian source summary is linked in source_url.`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
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
    const html = await fetchText(url);
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, html);
    return html;
  }
}

async function main() {
  const calendarHtml = await fs.readFile(CALENDAR_CACHE_PATH, "utf8").catch(() => fetchText(CALENDAR_URL));
  const events = parseCalendar(calendarHtml);
  const byUrl = new Map();
  for (const event of events) {
    if (!byUrl.has(event.source_url)) byUrl.set(event.source_url, []);
    byUrl.get(event.source_url).push(event);
  }

  for (const [url, linkedEvents] of byUrl) {
    try {
      const html = await readCachedOrFetch(url);
      const fullDescription = articleDescription(html);
      const title = articleTitle(html);
      for (const event of linkedEvents) {
        event.article_title = title;
        event.i18n = {
          en: {
            description: englishFallback(event.title)
          },
          ru: {
            description: shortDescription(fullDescription)
          }
        };
      }
    } catch (error) {
      for (const event of linkedEvents) {
        event.import_error = error.message;
      }
    }
  }

  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        source_url: CALENDAR_URL,
        imported_at: new Date().toISOString(),
        events
      },
      null,
      2
    )}\n`
  );
  console.log(JSON.stringify({ output: OUTPUT_PATH, events: events.length, urls: byUrl.size }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
