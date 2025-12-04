import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { scorers } from '../scorers/weather-scorer';
import { redditSearchTool } from '../tools/stackpicker-tool';

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

      Use the weatherTool to fetch current weather data.
  `,
	model: 'mistral/mistral-medium-2508',
	tools: { redditSearchTool },
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
			// Ce template sert d’ancrage pour le contexte court-terme
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
			// Optionnel selon l’API de ta version de Mastra :
			// maxTokens: 800,  // pour éviter un contexte qui explose
		},

		// Stockage persistant
		storage: new LibSQLStore({
			url: 'file:../mastra.db', // path is relative to the .mastra/output directory
		}),
	}),
});
