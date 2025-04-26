#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';

import * as actions from './operations/actions.js';
import {
  GitHubError,
  GitHubValidationError,
  GitHubResourceNotFoundError,
  GitHubAuthenticationError,
  GitHubPermissionError,
  GitHubRateLimitError,
  GitHubConflictError,
  GitHubTimeoutError,
  GitHubNetworkError,
  isGitHubError,
} from './common/errors.js';
import { VERSION } from "./common/version.js";

function formatGitHubError(error: GitHubError): string {
  let message = `GitHub API Error: ${error.message}`;
  if (error instanceof GitHubValidationError) {
    message = `Validation Error: ${error.message}`;
    if (error.response) {
      message += `\nDetails: ${JSON.stringify(error.response)}`;
    }
  } else if (error instanceof GitHubResourceNotFoundError) {
    message = `Not Found: ${error.message}`;
  } else if (error instanceof GitHubAuthenticationError) {
    message = `Authentication Failed: ${error.message}`;
  } else if (error instanceof GitHubPermissionError) {
    message = `Permission Denied: ${error.message}`;
  } else if (error instanceof GitHubRateLimitError) {
    message = `Rate Limit Exceeded: ${error.message}\nResets at: ${error.resetAt.toISOString()}`;
  } else if (error instanceof GitHubConflictError) {
    message = `Conflict: ${error.message}`;
  } else if (error instanceof GitHubTimeoutError) {
    message = `Timeout: ${error.message}\nTimeout setting: ${error.timeoutMs}ms`;
  } else if (error instanceof GitHubNetworkError) {
    message = `Network Error: ${error.message}\nError code: ${error.errorCode}`;
  }
  return message;
}

const errorHandler = (error: unknown) => {
  if (error instanceof z.ZodError) {
    throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
  }
  if (isGitHubError(error)) {
    throw new Error(formatGitHubError(error as GitHubError));
  }
  throw error;
};

const server = new McpServer({
  name: "github-actions-mcp-server",
  version: VERSION,
}, {
  capabilities: {
    tools: {},
  },
});

type ListWorkflowsParams = z.infer<typeof actions.ListWorkflowsSchema>;
type GetWorkflowParams = z.infer<typeof actions.GetWorkflowSchema>;
type GetWorkflowUsageParams = z.infer<typeof actions.GetWorkflowUsageSchema>;
type ListWorkflowRunsParams = z.infer<typeof actions.ListWorkflowRunsSchema>;
type GetWorkflowRunParams = z.infer<typeof actions.GetWorkflowRunSchema>;
type GetWorkflowRunJobsParams = z.infer<typeof actions.GetWorkflowRunJobsSchema>;
type TriggerWorkflowParams = z.infer<typeof actions.TriggerWorkflowSchema>;
type CancelWorkflowRunParams = z.infer<typeof actions.CancelWorkflowRunSchema>;
type RerunWorkflowParams = z.infer<typeof actions.RerunWorkflowSchema>;

server.tool(
  "list_workflows",
  "List workflows in a GitHub repository",
  actions.ListWorkflowsSchema.shape,
  async (params: ListWorkflowsParams) => {
    try {
      const result = await actions.listWorkflows(
        params.owner,
        params.repo,
        params.page,
        params.perPage
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "get_workflow",
  "Get details of a specific workflow",
  actions.GetWorkflowSchema.shape,
  async (params: GetWorkflowParams) => {
    try {
      const result = await actions.getWorkflow(
        params.owner,
        params.repo,
        params.workflowId
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "get_workflow_usage",
  "Get usage statistics of a workflow",
  actions.GetWorkflowUsageSchema.shape,
  async (params: GetWorkflowUsageParams) => {
    try {
      const result = await actions.getWorkflowUsage(
        params.owner,
        params.repo,
        params.workflowId
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "list_workflow_runs",
  "List all workflow runs for a repository or a specific workflow",
  actions.ListWorkflowRunsSchema.shape,
  async (params: ListWorkflowRunsParams) => {
    try {
      const { owner, repo, workflowId, ...options } = params;
      const result = await actions.listWorkflowRuns(owner, repo, {
        workflowId,
        ...options
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "get_workflow_run",
  "Get details of a specific workflow run",
  actions.GetWorkflowRunSchema.shape,
  async (params: GetWorkflowRunParams) => {
    try {
      const result = await actions.getWorkflowRun(
        params.owner,
        params.repo,
        params.runId
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "get_workflow_run_jobs",
  "Get details of a specific workflow run",
  actions.GetWorkflowRunJobsSchema.shape,
  async (params: GetWorkflowRunJobsParams) => {
    try {
      const { owner, repo, runId, filter, page, perPage } = params;
      const result = await actions.getWorkflowRunJobs(
        owner,
        repo,
        runId,
        filter,
        page,
        perPage
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "trigger_workflow",
  "Trigger a workflow run",
  actions.TriggerWorkflowSchema.shape,
  async (params: TriggerWorkflowParams) => {
    try {
      const { owner, repo, workflowId, ref, inputs } = params;
      const result = await actions.triggerWorkflow(
        owner,
        repo,
        workflowId,
        ref,
        inputs
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "cancel_workflow_run",
  "Cancel a workflow run",
  actions.CancelWorkflowRunSchema.shape,
  async (params: CancelWorkflowRunParams) => {
    try {
      const result = await actions.cancelWorkflowRun(
        params.owner,
        params.repo,
        params.runId
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

server.tool(
  "rerun_workflow",
  "Re-run a workflow run",
  actions.RerunWorkflowSchema.shape,
  async (params: RerunWorkflowParams) => {
    try {
      const result = await actions.rerunWorkflowRun(
        params.owner,
        params.repo,
        params.runId
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      errorHandler(error);
      return { content: [{ type: "text", text: "Error" }] };
    }
  },
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub Actions MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
