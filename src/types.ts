/**
 * Cursor hook schema definitions.
 *
 * Mirrors the documented hook payloads and responses at
 * https://cursor.com/docs/agent/hooks so hook scripts can be fully typed.
 */

/**
 * Supported hook event names.
 *
 * Docs: Hook events section.
 */
export type HookEventName =
    | "beforeShellExecution"
    | "beforeMCPExecution"
    | "afterFileEdit"
    | "beforeReadFile"
    | "beforeSubmitPrompt"
    | "stop";

/**
 * Properties shared by every hook payload.
 *
 * Docs: Common schema – Input (all hooks).
 */
export interface HookPayloadBase {
    conversation_id: string;
    generation_id: string;
    hook_event_name: HookEventName;
    workspace_roots: string[];
}

/**
 * Decision returned by beforeShellExecution / beforeMCPExecution hooks.
 */
export type HookPermission = "allow" | "deny" | "ask";

/**
 * Base shape for permissioned responses.
 */
export interface HookPermissionResponse {
    permission: HookPermission;
    userMessage?: string;
    agentMessage?: string;
}

/**
 * Payload provided to beforeShellExecution hooks.
 *
 * Docs: beforeShellExecution / beforeMCPExecution – Input section.
 */
export interface BeforeShellExecutionPayload extends HookPayloadBase {
    hook_event_name: "beforeShellExecution";
    command: string;
    cwd: string;
}

export type BeforeShellExecutionResponse = HookPermissionResponse;

/**
 * Payload provided to beforeMCPExecution hooks.
 *
 * Docs: beforeShellExecution / beforeMCPExecution – Input section.
 */
export interface BeforeMCPExecutionPayload extends HookPayloadBase {
    hook_event_name: "beforeMCPExecution";
    tool_name: string;
    tool_input: unknown;
    url?: string;
    command?: string;
}

export type BeforeMCPExecutionResponse = HookPermissionResponse;

/**
 * Individual text edit reported by afterFileEdit hooks.
 */
export interface HookTextEdit {
    old_string: string;
    new_string: string;
}

/**
 * Payload provided to afterFileEdit hooks.
 *
 * Docs: afterFileEdit – Input section.
 */
export interface AfterFileEditPayload extends HookPayloadBase {
    hook_event_name: "afterFileEdit";
    file_path: string;
    edits: HookTextEdit[];
}

export type AfterFileEditResponse = void;

/**
 * Attachment metadata supplied with file/prompt hooks.
 */
export interface HookAttachment {
    type: "file" | "rule" | string;
    file_path: string;
}

/**
 * Payload provided to beforeReadFile hooks.
 *
 * Docs: beforeReadFile – Input / Output sections.
 */
export interface BeforeReadFilePayload extends HookPayloadBase {
    hook_event_name: "beforeReadFile";
    file_path: string;
    content: string;
    attachments: HookAttachment[];
}

export interface BeforeReadFileResponse {
    permission: "allow" | "deny";
}

/**
 * Payload provided to beforeSubmitPrompt hooks.
 *
 * Docs: beforeSubmitPrompt – Input / Output sections.
 */
export interface BeforeSubmitPromptPayload extends HookPayloadBase {
    hook_event_name: "beforeSubmitPrompt";
    prompt: string;
    attachments: HookAttachment[];
}

export interface BeforeSubmitPromptResponse {
    continue: boolean;
}

/**
 * Payload provided to stop hooks.
 *
 * Docs: stop – Input section.
 */
export interface StopPayload extends HookPayloadBase {
    hook_event_name: "stop";
    status: "completed" | "aborted" | "error";
}

export type StopResponse = void;

/**
 * Mapping of each hook to its payload type.
 */
export interface HookPayloadMap {
    beforeShellExecution: BeforeShellExecutionPayload;
    beforeMCPExecution: BeforeMCPExecutionPayload;
    afterFileEdit: AfterFileEditPayload;
    beforeReadFile: BeforeReadFilePayload;
    beforeSubmitPrompt: BeforeSubmitPromptPayload;
    stop: StopPayload;
}

/**
 * Mapping of each hook to its expected response type.
 */
export interface HookResponseMap {
    beforeShellExecution: BeforeShellExecutionResponse;
    beforeMCPExecution: BeforeMCPExecutionResponse;
    afterFileEdit: AfterFileEditResponse;
    beforeReadFile: BeforeReadFileResponse;
    beforeSubmitPrompt: BeforeSubmitPromptResponse;
    stop: StopResponse;
}

export type HookPayload = HookPayloadMap[HookEventName];
export type HookResponse = HookResponseMap[HookEventName];

/**
 * Helper signature for strongly typed hook handlers.
 */
export type HookHandler<Event extends HookEventName> = (
    payload: HookPayloadMap[Event]
) => HookResponseMap[Event] | Promise<HookResponseMap[Event]>;

/**
 * Narrow a payload to a specific event type based on the hook_event_name.
 */
export function isHookPayloadOf<Event extends HookEventName>(
    payload: unknown,
    event: Event
): payload is HookPayloadMap[Event] {
    return (
        typeof payload === "object" &&
        payload !== null &&
        "hook_event_name" in payload &&
        (payload as HookPayloadBase).hook_event_name === event
    );
}

/**
 * Hook process configuration definition used within hooks.json.
 *
 * Docs: Hooks configuration – hook definitions.
 */
export interface HookCommandConfig {
    /**
     * Command executed when the hook fires. Accepts absolute paths, relative
     * paths (from hooks.json), or shell command strings.
     */
    command: string;
}

/**
 * Top-level hooks.json structure. Hook names align with documented events
 * and are limited to the currently supported list.
 *
 * Docs: Hooks configuration – hooks.json schema.
 */
export interface CursorHooksConfig {
    version: 1;
    hooks: Partial<Record<HookEventName, HookCommandConfig[]>>;
}
