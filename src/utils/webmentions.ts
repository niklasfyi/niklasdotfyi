import * as fs from "node:fs";
import { WEBMENTION_API_KEY } from "astro:env/server";
import type { WebmentionsCache, WebmentionsChildren, WebmentionsFeed } from "@/types";

const DOMAIN = import.meta.env.SITE;
const CACHE_DIR = ".data";
const filePath = `${CACHE_DIR}/webmentions.json`;
const validWebmentionTypes = ["like-of", "mention-of", "in-reply-to"];

const hostName = new URL(DOMAIN).hostname;

// Calls webmention.io api.
async function fetchWebmentions(timeFrom: string | null, perPage = 1000) {
	if (!DOMAIN) {
		console.warn("No domain specified. Please set in astro.config.ts");
		return null;
	}

	if (!WEBMENTION_API_KEY) {
		console.warn("No webmention api token specified in .env");
		return null;
	}

	let url = `https://webmention.io/api/mentions.jf2?domain=${hostName}&token=${WEBMENTION_API_KEY}&sort-dir=up&per-page=${perPage}`;

	if (timeFrom) url += `&since${timeFrom}`;

	const res = await fetch(url);

	if (res.ok) {
		const data = (await res.json()) as WebmentionsFeed;
		return data;
	}

	return null;
}

// Merge cached entries [a] with fresh webmentions [b], merge by wm-id
function mergeWebmentions(a: WebmentionsCache, b: WebmentionsFeed): WebmentionsChildren[] {
	return Array.from(
		[...a.children, ...b.children]
			.reduce((map, obj) => map.set(obj["wm-id"], obj), new Map())
			.values(),
	);
}

// filter out WebmentionChildren
export function filterWebmentions(webmentions: WebmentionsChildren[]) {
	return webmentions.filter((webmention) => {
		// make sure the mention has a property so we can sort them later
		if (!validWebmentionTypes.includes(webmention["wm-property"])) return false;

		// make sure 'mention-of' or 'in-reply-to' has text content.
		if (webmention["wm-property"] === "mention-of" || webmention["wm-property"] === "in-reply-to") {
			return webmention.content && webmention.content.text !== "";
		}

		return true;
	});
}

// save combined webmentions in cache file
function writeToCache(data: WebmentionsCache) {
	const fileContent = JSON.stringify(data, null, 2);

	// create cache folder if it doesn't exist already
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR);
	}

	// write data to cache json file
	fs.writeFile(filePath, fileContent, (err) => {
		if (err) throw err;
		console.log(`Webmentions saved to ${filePath}`);
	});
}

function getFromCache(): WebmentionsCache {
	if (fs.existsSync(filePath)) {
		const data = fs.readFileSync(filePath, "utf-8");
		return JSON.parse(data);
	}
	// no cache found
	return {
		lastFetched: null,
		children: [],
	};
}

async function getAndCacheWebmentions() {
	const cache = getFromCache();
	const mentions = await fetchWebmentions(cache.lastFetched);

	if (mentions) {
		mentions.children = filterWebmentions(mentions.children);
		const webmentions: WebmentionsCache = {
			lastFetched: new Date().toISOString(),
			// Make sure the first arg is the cache
			children: mergeWebmentions(cache, mentions),
		};

		writeToCache(webmentions);
		return webmentions;
	}

	return cache;
}

let webMentions: WebmentionsCache;

function normalizeUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		// Remove any content type segment like /checkins/, /notes/, etc.
		urlObj.pathname = urlObj.pathname.replace(/^\/[^/]+\/(\d{4}\/)/, "/$1");
		// Remove trailing slash
		return urlObj.href.replace(/\/$/, "");
	} catch {
		// if it's not a valid URL, return it as is.
		return url.replace(/\/$/, "");
	}
}

export async function getWebmentionsForUrl(url: string) {
	if (!webMentions) webMentions = await getAndCacheWebmentions();

	const urlObject = new URL(url);
	const path = urlObject.pathname;
	// Regex to match the new slug structure /YYYY/MM/DD/slug/
	const match = path.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/(.+?)\/?$/);

	let oldUrl: string | null = null;
	if (match) {
		const [, year, month, day, slug] = match;
		// construct the old slug structure /posts/YYYY-MM-DD-slug/
		const oldSlug = `${year}-${month}-${day}-${slug}`;
		const oldPath = `/posts/${oldSlug}/`;
		oldUrl = `${urlObject.origin}${oldPath}`;
	}

	console.log(`Fetching webmentions for URL: ${url}`);

	const normalizedUrl = normalizeUrl(url);
	const normalizedOldUrl = oldUrl ? normalizeUrl(oldUrl) : null;

	return webMentions.children.filter((entry) => {
		const normalizedTarget = normalizeUrl(entry["wm-target"]);
		if (normalizedTarget === normalizedUrl) return true;
		if (normalizedOldUrl && normalizedTarget === normalizedOldUrl) return true;
		return false;
	});
}
