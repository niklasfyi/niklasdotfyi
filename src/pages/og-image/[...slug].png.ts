import CaviarDreams from "@/assets/CaviarDreams.ttf";
import CaviarDreamsBold from "@/assets/CaviarDreams_Bold.ttf";
import { getAllEntries } from "@/data/entry";
import { siteConfig } from "@/site.config";
import { getFormattedDate } from "@/utils/date";
import { getEntryDate, getEntryOgImage, getEntryUpdated } from "@/utils/entry";
import { Resvg } from "@resvg/resvg-js";
import type { APIContext, InferGetStaticPropsType } from "astro";
import satori, { type SatoriOptions } from "satori";
import { html } from "satori-html";

const ogOptions: SatoriOptions = {
	// debug: true,
	fonts: [
		{
			data: Buffer.from(CaviarDreams),
			name: "Caviar Dreams",
			style: "normal",
			weight: 400,
		},
		{
			data: Buffer.from(CaviarDreamsBold),
			name: "Caviar Dreams Bold",
			style: "normal",
			weight: 700,
		},
	],
	height: 630,
	width: 1200,
};

const markup = (title: string, pubDate: string) =>
	html`<div
		style="background-color:#1d1f21;color:#c9cacc;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:24px;text-align:center;"
	>
		<img
			src=${siteConfig.url}/logo.png
			width="500"
			height="500"
			style="width:144px;height:144px;border-radius:999px;"
		/>
		<div style="font-size:72px;font-weight:400;">
			${siteConfig.author}
		</div>
		<div style="font-size:36px;font-weight:700;margin-top:8px;">
			${title}
		</div>
		<div style="font-size:20px;padding-top:16px;">
			${pubDate} - ${siteConfig.url.replace("https://", "").replace("/", "")}
		</div>
	</div>`;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export async function GET(context: APIContext) {
	const { pubDate, title } = context.props as Props;

	const postDate = getFormattedDate(pubDate);
	const svg = await satori(markup(title, postDate), ogOptions);
	const png = new Resvg(svg).render().asPng();
	return new Response(new Uint8Array(png), {
		headers: {
			"Cache-Control": "public, max-age=31536000, immutable",
			"Content-Type": "image/png",
		},
	});
}

export async function getStaticPaths() {
	const entries = await getAllEntries();
	return entries
		.filter((entry) => !getEntryOgImage(entry) && "title" in entry.data)
		.map((entry) => ({
			params: { slug: entry.id },
			props: {
				pubDate: getEntryUpdated(entry) ?? getEntryDate(entry),
				title: (entry.data as { title: string }).title,
			},
		}));
}
