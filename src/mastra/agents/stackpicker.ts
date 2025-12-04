import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { scorers } from '../scorers/weather-scorer';
import {redditSearchTool} from '../tools/stackpicker-tool';

export const stackpickerAgent = new Agent({
	name: 'StackPicker Agent',
	instructions: `
      You are a helpful stack picker assistant that provides accurate ai stack information and can help choosing architecture decision.

      Your primary function is to help users get ai framework details, llm details. When responding:
      - Always ask for a technology if none is provided
      - If the technology name isn't in English, please translate it
      - If giving a technology with multiple parts (e.g. "AI", "I.A"), use the most relevant part (e.g. "artificial intelligence")
      - Include relevant details like age, popularity, and pertinent use cases.
      - Keep responses concise but informative
      - Respond in the format they request.

      Use the weatherTool to fetch current weather data.
`,
	model: 'mistral/mistral-medium-2508',
	tools: { redditSearchTool },
	scorers: {
		toolCallAppropriateness: {
			scorer: scorers.toolCallAppropriatenessScorer,
			sampling: {
				type: 'ratio',
				rate: 1,
			},
		},
		completeness: {
			scorer: scorers.completenessScorer,
			sampling: {
				type: 'ratio',
				rate: 1,
			},
		},
		translation: {
			scorer: scorers.translationScorer,
			sampling: {
				type: 'ratio',
				rate: 1,
			},
		},
	},
	memory: new Memory({
		storage: new LibSQLStore({
			url: 'file:../mastra.db', // path is relative to the .mastra/output directory
		}),
	}),
});
