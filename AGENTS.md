# Cursor Hooks

This repository publishes the `cursor-hooks` package: typed utilities for building Cursor agent hook scripts in TypeScript or JavaScript. Install it to get strongly typed payload/response definitions for every hook event plus helpers like `isHookPayloadOf` so each script can safely narrow incoming JSON before running custom logic. The package mirrors the official Cursor hook schema and pairs nicely with any runtime that can execute Node, Bun, or plain JS files.

Key capabilities offered by the library:
- Type-safe payload and response interfaces for all hook events.
- A generic `HookHandler` signature for wiring handler maps.
- Runtime guards to validate `hook_event_name` before handling input.
- Works with Bun, Node, or any stdin/stdout compatible runtime.

Combine these helpers with the platform features below to ship production-ready hooks quickly.

## Publishing and release workflow

When you ask this agent to "publish" or "push", treat it as a request to wrap up the work using Conventional Commit messages so semantic-release can infer the next version. After completing the requested changes, follow the conventional commit flow and run the release steps expected by semantic-release.

## Cursor hook platform overview

Hooks let you observe, control, and extend the agent loop using custom scripts. Hooks are spawned processes that communicate over stdio using JSON in both directions. They run before or after defined stages of the agent loop and can observe, block, or modify behavior.

With hooks, you can:

-   Run formatters after edits
-   Add analytics for events
-   Scan for PII or secrets
-   Gate risky operations (e.g., SQL writes)

## [Quickstart](https://cursor.com/docs/agent/hooks#quickstart)

Create a `hooks.json` file in your home directory at `~/.cursor/hooks.json` or in your project directory at `<project-root>/.cursor/hooks.json`

Create your hook script at `~/.cursor/hooks/format.sh`:

Make it executable:

Restart Cursor. Your hook now runs after every file edit.

## [Examples](https://cursor.com/docs/agent/hooks#examples)

## [Configuration](https://cursor.com/docs/agent/hooks#configuration)

Define hooks in a `hooks.json` file. Configuration can exist at multiple levels; higher-priority sources override lower ones:

-   Project Directory (Project-specific):
    -   `<project-root>/.cursor/hooks.json`
-   Home Directory (User-specific):
    -   `~/.cursor/hooks.json`
-   Global (Enterprise-managed):
    -   macOS: `/Library/Application Support/Cursor/hooks.json`
    -   Linux/WSL: `/etc/cursor/hooks.json`
    -   Windows: `C:\\ProgramData\\Cursor\\hooks.json`

The `hooks` object maps hook names to arrays of hook definitions. Each definition currently supports a `command` property that can be a shell string, an absolute path, or a path relative to the `hooks.json` file.

### [Configuration file](https://cursor.com/docs/agent/hooks#configuration-file)

## [Reference](https://cursor.com/docs/agent/hooks#reference)

### [Common schema](https://cursor.com/docs/agent/hooks#common-schema)

#### [Input (all hooks)](https://cursor.com/docs/agent/hooks#input-all-hooks)

### [Hook events](https://cursor.com/docs/agent/hooks#hook-events)

#### [beforeShellExecution / beforeMCPExecution](https://cursor.com/docs/agent/hooks#beforeshellexecution-beforemcpexecution)

Called before any shell command or MCP tool is executed. Return a permission decision.

#### [afterFileEdit](https://cursor.com/docs/agent/hooks#afterfileedit)

Fires after a file is edited; useful for formatters or accounting of agent-written code.

#### [beforeReadFile](https://cursor.com/docs/agent/hooks#beforereadfile)

Enable redaction or access control before the agent reads a file. Includes any prompt attachments for auditing rules inclusion.

#### [beforeSubmitPrompt](https://cursor.com/docs/agent/hooks#beforesubmitprompt)

Called right after user hits send but before backend request. Can prevent submission.

#### [stop](https://cursor.com/docs/agent/hooks#stop)

Called when the agent loop ends.

## [Troubleshooting](https://cursor.com/docs/agent/hooks#troubleshooting)

**I'm on SSH, how do I use hooks?**

Remote SSH is not yet supported

**How to confirm hooks are active**

There is a Hooks tab in Cursor Settings to debug configured and executed hooks, as well as a Hooks output channel to see errors.

**If hooks are not working**

-   Restart Cursor to ensure the hooks service is running.
-   Ensure hook script paths are relative to `hooks.json` when using relative paths.
