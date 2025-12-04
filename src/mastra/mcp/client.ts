import { MCPClient } from "@mastra/mcp"
export const mcpClient = new MCPClient({
	id: "test-mcp-client",
	servers: {
		filesystem: {
			"command": "npx",
			"args": [
				"-y",
				"@modelcontextprotocol/server-filesystem",
				"."
			]
		}
	}
});