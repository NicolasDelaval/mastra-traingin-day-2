// src/tools/redditSearchTool.ts
import { z } from "zod";
import { Tool } from "@mastra/core/tools"; // ajuste le chemin selon ta version/projet

/**
 * Tool Mastra : recherche sur Reddit des infos liées
 * aux technos de développement IA.
 */
export const redditSearchTool = new Tool({
	name: "reddit_ai_dev_search",
	description: `
    Recherche des discussions Reddit sur les technologies de développement IA
    (LLM, RAG, frameworks, outils, bonnes pratiques, etc.).
    Utilise la recherche Reddit et renvoie une liste de posts pertinents.
  `,
	inputSchema: z.object({
		query: z
			.string()
			.min(3)
			.describe(
				"Requête de recherche Reddit, par ex: 'RAG architecture', 'LangChain vs LlamaIndex', 'OpenAI function calling best practices'"
			),
		limit: z
			.number()
			.int()
			.min(1)
			.max(25)
			.default(10)
			.describe("Nombre max de posts à renvoyer (1–25)."),
		minScore: z
			.number()
			.int()
			.min(0)
			.default(10)
			.describe("Score minimal Reddit pour filtrer les posts peu pertinents."),
		timeRange: z
			.enum(["hour", "day", "week", "month", "year", "all"])
			.default("week")
			.describe("Fenêtre de temps Reddit (hour, day, week, month, year, all)."),
	}),
	outputSchema: z.object({
		results: z.array(
			z.object({
				title: z.string(),
				subreddit: z.string(),
				score: z.number(),
				numComments: z.number(),
				url: z.string(),
				permalink: z.string(),
				createdUtc: z.number(),
				selftext: z.string().optional(),
			})
		),
	}),

	// Implémentation
	execute: async (input) => {
		const { query, limit, minScore, timeRange } = input;

		// Liste de subreddits orientés dev / IA (modifiable)
		const aiSubreddits = [
			"MachineLearning",
			"LocalLLaMA",
			"LanguageTechnology",
			"ArtificialInteligence",
			"deeplearning",
			"learnmachinelearning",
			"MLQuestions",
			"StableDiffusion",
			"OpenAI",
			"PromptEngineering",
			"softwareengineering",
			"programming",
		];

		// On ajoute quelques mots-clés IA/dev par défaut pour cibler le domaine
		const aiKeywords = [
			"LLM",
			"RAG",
			"LangChain",
			"LlamaIndex",
			"OpenAI",
			"Anthropic",
			"Mistral",
			"vector store",
			"agents",
			"prompt",
			"tool calling",
			"function calling",
		];

		// Construire la requête Reddit
		const subredditsQuery = aiSubreddits.map((s) => `subreddit:${s}`).join(" OR ");
		const aiKeywordsQuery = aiKeywords.map((k) => `"${k}"`).join(" OR ");

		const fullQuery = `${query} (${aiKeywordsQuery}) (${subredditsQuery})`;

		const params = new URLSearchParams({
			q: fullQuery,
			sort: "relevance",
			t: timeRange, // hour/day/week/month/year/all
			limit: String(limit),
			restrict_sr: "false",
			type: "link",
		});

		const url = `https://www.reddit.com/search.json?${params.toString()}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				"User-Agent": "Mastra-AI-Dev-Tool/1.0 (by u/your-username)",
			},
		});

		if (!response.ok) {
			throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
		}

		const json = (await response.json()) as any;

		const children = json?.data?.children ?? [];

		const results = children
			.map((c: any) => c.data)
			.filter((d: any) => d && typeof d.score === "number" && d.score >= minScore)
			.map((d: any) => ({
				title: d.title as string,
				subreddit: d.subreddit as string,
				score: d.score as number,
				numComments: d.num_comments as number,
				url: `https://www.reddit.com${d.permalink}` as string,
				permalink: d.permalink as string,
				createdUtc: d.created_utc as number,
				selftext: d.selftext as string | undefined,
			}));

		return { results };
	},
});
