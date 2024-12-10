#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z } from 'zod';

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

const server = new Server(
  { name: 'snyk-mcp-server', version: '1.0.0' },
  {
    capabilities: {
      tools: {
        scan_repository: {
          description: 'Scan a repository for security vulnerabilities using Snyk',
          parameters: ScanRepoSchema
        },
        scan_project: {
          description: 'Scan an existing Snyk project',
          parameters: ScanProjectSchema
        }
      }
    }
  }
);

server.methods.scan_repository = async ({ url, branch }) => {
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
          remoteUrl: url + (branch ? `/tree/${branch}` : '')
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
};

server.methods.scan_project = async ({ projectId }) => {
  const response = await fetch(
    `https://snyk.io/api/v1/project/${projectId}/issues`,
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
};

const transport = new StdioServerTransport();
server.listen(transport);
console.error('Snyk MCP Server running on stdio');