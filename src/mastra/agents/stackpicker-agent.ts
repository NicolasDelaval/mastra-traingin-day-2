// stackpickerAgent.ts
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { scorers } from '../scorers/weather-scorer';
import { redditSearchTool } from '../tools/stackpicker-tool';

import { mcpClient } from  '../mcp/client';

export const stackpickerAgent = new Agent({
	name: 'StackPicker Agent',
	instructions: `
      You are a helpful stack picker assistant that provides accurate AI stack information and can help with architecture decisions.

      Your primary function is to help users get AI framework details and LLM details. When responding:
      - Always ask for a technology if none is provided
      - If the technology name isn't in English, please translate it
      - If given a technology with multiple parts (e.g. "AI", "I.A"), use the most relevant part (e.g. "artificial intelligence")
      - Include relevant details like age, popularity, and pertinent use cases
      - Keep responses concise but informative
      - Respond in the format they request.

      You also have access to filesystem tools exposed through the Model Context Protocol (MCP) filesystem server.

      When the user asks you to save results to a file (for example: "sauvegarde cette réponse dans un fichier", 
      "write this to a file", "exporte en .txt" etc.):
      - Use the filesystem MCP tools (like "writeFile" if available) to create or overwrite a file.
      - Choose a simple default path if none is given, such as "./output/stackpicker-result.txt".
      - Confirm to the user that the file has been written and indicate the path.

  `,
	model: 'mistral/mistral-medium-2508',

	/**
	 * Ici, on récupère dynamiquement les outils du serveur MCP filesystem
	 * via mcpClient.getTools(), et on les merge avec nos tools internes.
	 */
	tools: async () => {
		// Récupère les tools MCP (filesystem, etc.)
		const mcpTools = await mcpClient.getTools();

		// mcpTools est supposé être un objet de la forme { toolName: toolInstance, ... }
		// On merge avec nos tools "maison"
		return {
			// tools existants
			redditSearchTool,

			// tous les tools fournis par le serveur filesystem (ex: readFile, writeFile, listDir, etc.)
			...mcpTools,
		};
	},

	scorers: {
		toolCallAppropriateness: {
			scorer: scorers.toolCallAppropriatenessScorer,
			sampling: { type: 'ratio', rate: 1 },
		},
		completeness: {
			scorer: scorers.completenessScorer,
			sampling: { type: 'ratio', rate: 1 },
		},
		translation: {
			scorer: scorers.translationScorer,
			sampling: { type: 'ratio', rate: 1 },
		},
	},

	memory: new Memory({
		workingMemory: {
			enabled: true,
			template: `# Contexte de la conversation
- **Objectif utilisateur**: {{goal}}
- **Niveau technique**: {{user_skill_level}}
- **Format de réponse souhaité**: {{preferred_format}}  <!-- ex: markdown, tableau, JSON -->

# Projet utilisateur
- **Nom du projet**: {{project_name}}
- **Domaine**: {{project_domain}}  <!-- ex: SaaS, e-commerce, data platform -->
- **Contraintes**: {{constraints}}  <!-- ex: budget, latence, on-prem, RGPD -->

# Choix techniques
- **Langage préféré**: {{preferred_language}}
- **Frameworks / libs existants**: {{existing_stack}}
- **Cloud provider**: {{cloud_provider}}

# Historique récent
- **Décisions d’architecture récentes**: {{recent_decisions}}
- **Technos envisagées**: {{candidate_technologies}}
`,
		},

		storage: new LibSQLStore({
			url: 'file:../mastra.db', // path is relative to the .mastra/output directory
		}),
	}),
});
