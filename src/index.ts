#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const server = new Server({
  name: "snyk-mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {}
  }
});

const SNYK_API_KEY = process.env.SNYK_API_KEY;

if (!SNYK_API_KEY) {
  console.error("SNYK_API_KEY environment variable is not set");
  process.exit(1);
}

// Schema definitions
const ScanRepoSchema = z.object({
  url: z.string().url().describe('Repository URL to scan'),
  branch: z.string().optional().describe('Branch to scan (optional)')
});

const ScanProjectSchema = z.object({
  projectId: z.string().describe('Snyk project ID to scan')
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "scan_repository",
        description: "Scan a repository for security vulnerabilities using Snyk",
        inputSchema: zodToJsonSchema(ScanRepoSchema)
      },
      {
        name: "scan_project",
        description: "Scan an existing Snyk project",
        inputSchema: zodToJsonSchema(ScanProjectSchema)
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "scan_repository": {
        const args = ScanRepoSchema.parse(request.params.arguments);

        const response = await fetch(
          'https://snyk.io/api/v1/test',
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${SNYK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              target: {
                remoteUrl: args.url + (args.branch ? `/tree/${args.branch}` : '')
              }
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Snyk API error: ${response.statusText}`);
        }

        const result = await response.json();
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify(result, null, 2) 
          }] 
        };
      }

      case "scan_project": {
        const args = ScanProjectSchema.parse(request.params.arguments);

        const response = await fetch(
          `https://snyk.io/api/v1/project/${args.projectId}/issues`,
          {
            headers: {
              'Authorization': `token ${SNYK_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Snyk API error: ${response.statusText}`);
        }

        const result = await response.json();
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify(result, null, 2) 
          }] 
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Snyk MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});