# cursor-hooks

TypeScript definitions and helpers for building [Cursor agent hooks](https://cursor.com/docs/agent/hooks).

## Installation

### 1. Create a hooks directory in your project

```bash
mkdir -p .cursor/hooks
cd .cursor/hooks
```

### 2. Initialize a Bun project

Install [Bun](https://bun.sh/) if you haven't already, then initialize:

```bash
bun init -y
```

### 3. Install cursor-hooks

```bash
bun install cursor-hooks
```

### 4. Create a hooks.json configuration

In your `.cursor` directory (at the project root), create a `hooks.json` file.

**Important:** Hook command paths are relative to the `.cursor/hooks.json` file location.

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "bun run hooks/before-shell-execution.ts"
      }
    ],
    "afterFileEdit": [
      {
        "command": "bun run hooks/after-file-edit.ts"
      }
    ]
  }
}
```

This configuration assumes your hooks are in `.cursor/hooks/` and the `hooks.json` is at `.cursor/hooks.json`.

### 5. Enable JSON Schema validation (optional)

Add this to your Cursor settings (`~/Library/Application Support/Cursor/User/settings.json` on macOS) to get autocomplete and validation:

```json
{
  "json.validate.enable": true,
  "json.format.enable": true,
  "json.schemaDownload.enable": true,
  "json.schemas": [
    {
      "fileMatch": [".cursor/hooks.json"],
      "url": "https://unpkg.com/cursor-hooks/schema/hooks.schema.json"
    }
  ]
}
```

## Real-world Examples

### Example 1: Block npm commands, enforce bun

`before-shell-execution.ts`:

```ts
import type { BeforeShellExecutionPayload, BeforeShellExecutionResponse } from "cursor-hooks";

const input: BeforeShellExecutionPayload = await Bun.stdin.json();

const startsWithNpm = input.command.startsWith("npm") || input.command.includes(" npm ");

const output: BeforeShellExecutionResponse = {
    permission: startsWithNpm ? "deny" : "allow",
    agentMessage: startsWithNpm ? "npm is not allowed, always use bun instead" : undefined,
};

console.log(JSON.stringify(output, null, 2));
```

### Example 2: Gate prompts with a keyword

`before-submit-prompt.ts`:

```ts
import type { BeforeSubmitPromptPayload, BeforeSubmitPromptResponse } from "cursor-hooks";

const input: BeforeSubmitPromptPayload = await Bun.stdin.json();

const output: BeforeSubmitPromptResponse = {
    continue: input.prompt.includes("allow"),
};

console.log(JSON.stringify(output, null, 2));
```

### Example 3: Auto-format and log file edits

`after-file-edit.ts`:

```ts
import type { AfterFileEditPayload } from "cursor-hooks";

import { appendFile, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const input: AfterFileEditPayload = await Bun.stdin.json();

if (input.file_path.endsWith(".ts")) {
    const result = await Bun.$`bunx @biomejs/biome lint --fix --unsafe --verbose ${input.file_path}`

    const output = {
        timestamp: new Date().toISOString(),
        ...input,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode,
    }
    console.error(JSON.stringify(output, null, 2))

    const logFilePath = join(input.workspace_roots[0]!, "logs", "after-file-edit.jsonl")

    // Check if log file exists and count entries
    let logContent = ""
    try {
        logContent = await readFile(logFilePath, "utf-8")
    } catch (_error) {
        // File doesn't exist yet, that's fine
    }

    // Count JSON objects by counting opening braces at the start of lines
    const entryCount = (logContent.match(/^\s*\{/gm) || []).length

    // If we have more than 500 entries, remove the first 100
    if (entryCount >= 500) {
        const lines = logContent.trim().split('\n')
        const jsonObjects: string[] = []
        let currentObject = ""
        let braceCount = 0

        // Parse JSON objects from the content
        for (const line of lines) {
            currentObject += `${line}\n`
            braceCount += (line.match(/\{/g) || []).length
            braceCount -= (line.match(/\}/g) || []).length

            if (braceCount === 0 && currentObject.trim()) {
                jsonObjects.push(currentObject.trim())
                currentObject = ""
            }
        }

        // Keep only the last (total - 100) entries
        const entriesToKeep = jsonObjects.slice(100)
        const trimmedContent = `${entriesToKeep.join('\n')}\n`

        await writeFile(logFilePath, trimmedContent)
    }

    await appendFile(logFilePath, JSON.stringify(output, null, 2))
}
```

## Available Hook Types

### beforeShellExecution

Intercept and control shell commands before execution.

**Payload:** `BeforeShellExecutionPayload`
- `command`: The shell command to execute
- `workspace_roots`: Array of workspace root paths
- `hook_event_name`: "beforeShellExecution"

**Response:** `BeforeShellExecutionResponse`
- `permission`: "allow" | "deny" | "ask"
- `agentMessage?`: Message shown to the AI agent
- `userMessage?`: Message shown to the user

### beforeSubmitPrompt

Control whether prompts are submitted to the AI.

**Payload:** `BeforeSubmitPromptPayload`
- `prompt`: The user's prompt text
- `workspace_roots`: Array of workspace root paths
- `hook_event_name`: "beforeSubmitPrompt"

**Response:** `BeforeSubmitPromptResponse`
- `continue`: boolean - whether to allow the prompt

### afterFileEdit

React to file edits made by the AI agent.

**Payload:** `AfterFileEditPayload`
- `file_path`: Path to the edited file
- `edits`: Array of edit operations
- `workspace_roots`: Array of workspace root paths
- `hook_event_name`: "afterFileEdit"

**Response:** None (this is a notification hook)

### beforeReadFile

Control file access before the AI reads a file.

**Payload:** `BeforeReadFilePayload`
- `file_path`: Path to the file being read
- `content`: The file contents
- `workspace_roots`: Array of workspace root paths
- `hook_event_name`: "beforeReadFile"

**Response:** `BeforeReadFileResponse`
- `permission`: "allow" | "deny"
- `agentMessage?`: Message shown to the AI agent
- `userMessage?`: Message shown to the user

### beforeMCPExecution

Control MCP tool execution before it runs.

**Payload:** `BeforeMCPExecutionPayload`
- `tool_name`: Name of the MCP tool
- `arguments`: Tool arguments
- `workspace_roots`: Array of workspace root paths
- `hook_event_name`: "beforeMCPExecution"

**Response:** `BeforeMCPExecutionResponse`
- `permission`: "allow" | "deny" | "ask"
- `agentMessage?`: Message shown to the AI agent
- `userMessage?`: Message shown to the user

### stop

Notification when the AI agent finishes execution.

**Payload:** `StopPayload`
- `status`: The completion status
- `workspace_roots`: Array of workspace root paths
- `hook_event_name`: "stop"

**Response:** None (this is a notification hook)

## Type Safety Helpers

### isHookPayloadOf

Validate and narrow hook payload types:

```ts
import { isHookPayloadOf } from "cursor-hooks";

const rawInput: unknown = await Bun.stdin.json();

if (isHookPayloadOf(rawInput, "beforeShellExecution")) {
  // TypeScript now knows rawInput is BeforeShellExecutionPayload
  console.log(rawInput.command);
}
```

## JSON Schema Validation

Add schema validation to your `hooks.json`:

```json
{
  "$schema": "https://unpkg.com/cursor-hooks@latest/schema/hooks.schema.json",
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      { "command": "bun run .cursor/hooks/format.ts" }
    ]
  }
}
```

## Development

### Build

```bash
npm run build
```

### Release

- Follow [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning
- CI automatically publishes to npm on pushes to `main`
- Run `./scripts/setup-publish.sh` to configure npm token

## License

MIT
