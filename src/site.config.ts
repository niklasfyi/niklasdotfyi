import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
	// Used as both a meta property (src/components/BaseHead.astro L:31 + L:49) & the generated satori png (src/pages/og-image/[slug].png.ts)
	author: "Niklas Siefke",
	// Meta property used to construct the meta title property, found in src/components/BaseHead.astro L:11
	title: "Niklas Siefke | Software Engineer",
	// Meta property used as the default description meta property
	description: "Just another software engineer",
	// HTML lang property, found in src/layouts/Base.astro L:18
	lang: "en-GB",
	// Meta property, found in src/components/BaseHead.astro L:42
	ogLocale: "en_GB",
	// Date.prototype.toLocaleDateString() parameters, found in src/utils/date.ts.
	date: {
		locale: "en-GB",
		options: {
			weekday: "short",
			day: "2-digit",
			month: "short",
			year: "numeric",
		},
	},
	webmentions: {
		link: "https://webmention.io/www.niklas.fyi/webmention",
		pingback: "https://webmention.io/www.niklas.fyi/xmlrpc",
	},
};

// Used to generate links in both the Header & Footer.
export const menuLinks: Array<{ title: string; path: string }> = [
	{
		title: "Home",
		path: "/",
	},
	{
		title: "About",
		path: "/about/",
	},
	{
		title: "Blog",
		path: "/posts/",
	},
];
