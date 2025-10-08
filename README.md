# cursor-hooks

TypeScript definitions and helpers for building [Cursor agent hooks](https://cursor.com/docs/agent/hooks). Copy/paste the snippets below to scaffold fully typed hook scripts for any event.

## Install

```bash
npm install cursor-hooks
```

## Quick start (TypeScript)

Create a hook script (example uses Bun, but works with any TS runner):

```ts
#!/usr/bin/env bun
import {
  isHookPayloadOf,
  type BeforeShellExecutionPayload,
  type BeforeShellExecutionResponse,
} from "cursor-hooks";

const rawInput: unknown = JSON.parse(await Bun.stdin.text());

if (!isHookPayloadOf(rawInput, "beforeShellExecution")) {
  console.error("Unexpected hook payload", rawInput);
  process.exit(1);
}

const input: BeforeShellExecutionPayload = rawInput;

const response: BeforeShellExecutionResponse = {
  permission: input.command.includes("rm -rf") ? "deny" : "allow",
  userMessage: "Command reviewed.",
};

console.log(JSON.stringify(response));
```

Wire it up in `hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": "./hooks/before-shell-execution.ts" }
    ]
  }
}
```

## Quick start (JavaScript / Node)

```js
#!/usr/bin/env node
import {
  isHookPayloadOf,
} from "cursor-hooks";

const buffers = [];
for await (const chunk of process.stdin) buffers.push(chunk);
const rawInput = JSON.parse(Buffer.concat(buffers).toString("utf8"));

if (!isHookPayloadOf(rawInput, "stop")) {
  console.error("Unexpected payload for stop hook", rawInput);
  process.exit(1);
}

console.log(JSON.stringify({}));
```

## Hook-by-hook templates

### beforeShellExecution

```ts
import {
  isHookPayloadOf,
  type BeforeShellExecutionPayload,
  type BeforeShellExecutionResponse,
} from "cursor-hooks";

export async function handleBeforeShellExecution(
  payload: unknown,
): Promise<BeforeShellExecutionResponse> {
  if (!isHookPayloadOf(payload, "beforeShellExecution")) {
    throw new Error("Invalid beforeShellExecution payload");
  }

  const input: BeforeShellExecutionPayload = payload;

  if (input.command.includes("rm -rf")) {
    return {
      permission: "deny",
      userMessage: "Dangerous command blocked.",
      agentMessage: "Rejected destructive command.",
    };
  }

  return { permission: "allow" };
}
```

### beforeMCPExecution

```ts
import {
  isHookPayloadOf,
  type BeforeMCPExecutionPayload,
  type BeforeMCPExecutionResponse,
} from "cursor-hooks";

export function handleBeforeMCPExecution(
  payload: unknown,
): BeforeMCPExecutionResponse {
  if (!isHookPayloadOf(payload, "beforeMCPExecution")) {
    throw new Error("Invalid beforeMCPExecution payload");
  }

  const input: BeforeMCPExecutionPayload = payload;

  if (input.tool_name === "dangerousTool") {
    return {
      permission: "ask",
      userMessage: "Tool requires confirmation.",
      agentMessage: "Waiting for user approval.",
    };
  }

  return { permission: "allow" };
}
```

### afterFileEdit

```ts
import {
  isHookPayloadOf,
  type AfterFileEditPayload,
} from "cursor-hooks";

export async function handleAfterFileEdit(payload: unknown): Promise<void> {
  if (!isHookPayloadOf(payload, "afterFileEdit")) {
    throw new Error("Invalid afterFileEdit payload");
  }

  const input: AfterFileEditPayload = payload;

  for (const edit of input.edits) {
    console.error(`Edited ${input.file_path}:`, edit);
  }
}
```

### beforeReadFile

```ts
import {
  isHookPayloadOf,
  type BeforeReadFilePayload,
  type BeforeReadFileResponse,
} from "cursor-hooks";

export function handleBeforeReadFile(
  payload: unknown,
): BeforeReadFileResponse {
  if (!isHookPayloadOf(payload, "beforeReadFile")) {
    throw new Error("Invalid beforeReadFile payload");
  }

  const input: BeforeReadFilePayload = payload;
  const containsSecret = input.content.includes("API_KEY");

  return containsSecret
    ? { permission: "deny" }
    : { permission: "allow" };
}
```

### beforeSubmitPrompt

```ts
import {
  isHookPayloadOf,
  type BeforeSubmitPromptPayload,
  type BeforeSubmitPromptResponse,
} from "cursor-hooks";

export function handleBeforeSubmitPrompt(
  payload: unknown,
): BeforeSubmitPromptResponse {
  if (!isHookPayloadOf(payload, "beforeSubmitPrompt")) {
    throw new Error("Invalid beforeSubmitPrompt payload");
  }

  const input: BeforeSubmitPromptPayload = payload;

  if (input.prompt.length > 2000) {
    return {
      continue: false,
      userMessage: "Prompt too long. Trim it before sending.",
    };
  }

  return { continue: true };
}
```

### stop

```ts
import {
  isHookPayloadOf,
  type StopPayload,
} from "cursor-hooks";

export function handleStop(payload: unknown): void {
  if (!isHookPayloadOf(payload, "stop")) {
    throw new Error("Invalid stop payload");
  }

  const input: StopPayload = payload;
  console.error(`Agent finished with status: ${input.status}`);
}
```

## Combining handlers

Wire multiple handlers together with a map keyed by `hook_event_name`:

```ts
import {
  type HookEventName,
  type HookHandler,
  type HookPayload,
} from "cursor-hooks";
import {
  handleAfterFileEdit,
  handleBeforeMCPExecution,
  handleBeforeReadFile,
  handleBeforeShellExecution,
  handleBeforeSubmitPrompt,
  handleStop,
} from "./handlers.ts";

const handlers: Partial<Record<HookEventName, HookHandler<HookEventName>>> = {
  beforeShellExecution: handleBeforeShellExecution,
  beforeMCPExecution: handleBeforeMCPExecution,
  afterFileEdit: handleAfterFileEdit,
  beforeReadFile: handleBeforeReadFile,
  beforeSubmitPrompt: handleBeforeSubmitPrompt,
  stop: handleStop,
};

const payload = JSON.parse(await Bun.stdin.text()) as HookPayload;
const handler = handlers[payload.hook_event_name];

if (handler) {
  const response = await handler(payload as never);
  if (response !== undefined) {
    console.log(JSON.stringify(response));
  }
} else {
  console.error(`No handler for ${payload.hook_event_name}`);
  process.exit(1);
}
```

## Build

```bash
npm run build
```

## Release automation

- Follow [Conventional Commits](https://www.conventionalcommits.org/) so `semantic-release` can determine the next version.
- CI publishes to npm on pushes to `main`; release metadata never commits back to the repo.
- Run `./scripts/setup-publish.sh` once to create an npm token and store it as the `NPM_TOKEN` GitHub secret via CLI prompts.

## License

MIT
