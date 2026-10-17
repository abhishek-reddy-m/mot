/** Turns a stored Claude message history into chat items for the admin UI */
import type Anthropic from '@anthropic-ai/sdk';
import type { AgentConversation } from '@prisma/client';
import { CONTEXT_PREFIX, pendingActions, PendingAction } from './agent';
import { TOOL_LABELS, WRITE_TOOLS } from './tools';

export type ChatItem =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | {
      kind: 'tool';
      id: string;
      name: string;
      label: string;
      isChange: boolean;
      status: 'running' | 'done' | 'failed' | 'rejected' | 'awaiting_approval';
      detail: string | null;
    };

function resultText(content: Anthropic.Beta.BetaToolResultBlockParam['content']): string {
  if (typeof content === 'string') return content;
  return (content ?? []).map((block) => ('text' in block ? block.text : '')).join('');
}

/** A one-line outcome for a change, taken from the tool's JSON result */
function changeDetail(text: string): string | null {
  try {
    const result = JSON.parse(text);
    if (typeof result?.summary === 'string') return result.summary;
    if (Array.isArray(result?.promotions)) {
      return result.promotions.map((p: { name: string; status: string }) => `"${p.name}" ${p.status.toLowerCase()}`).join(', ');
    }
    if (typeof result?.name === 'string' && typeof result?.status === 'string') {
      return `"${result.name}" ${result.status.toLowerCase()}`;
    }
  } catch {
    // not JSON
  }
  return null;
}

export function conversationView(conversation: AgentConversation) {
  const messages = JSON.parse(conversation.messages) as Anthropic.Beta.BetaMessageParam[];
  const pending: PendingAction[] = pendingActions(conversation);
  const pendingIds = new Set(pending.map((a) => a.toolUseId));
  const items: ChatItem[] = [];
  const toolItems = new Map<string, Extract<ChatItem, { kind: 'tool' }>>();

  for (const message of messages) {
    const blocks = typeof message.content === 'string' ? [{ type: 'text' as const, text: message.content }] : message.content;
    for (const block of blocks) {
      if (block.type === 'text') {
        if (message.role === 'user' && block.text.startsWith(CONTEXT_PREFIX)) continue;
        if (block.text.trim()) items.push({ kind: message.role === 'user' ? 'user' : 'assistant', text: block.text });
      } else if (block.type === 'tool_use') {
        const item: Extract<ChatItem, { kind: 'tool' }> = {
          kind: 'tool',
          id: block.id,
          name: block.name,
          label: TOOL_LABELS[block.name] ?? block.name,
          isChange: WRITE_TOOLS.has(block.name),
          status: pendingIds.has(block.id) ? 'awaiting_approval' : 'running',
          detail: null,
        };
        toolItems.set(block.id, item);
        items.push(item);
      } else if (block.type === 'tool_result') {
        const item = toolItems.get(block.tool_use_id);
        if (!item) continue;
        const text = resultText(block.content);
        if (block.is_error) {
          item.status = /rejected|not applied/i.test(text) ? 'rejected' : 'failed';
          item.detail = text.slice(0, 300);
        } else {
          item.status = 'done';
          item.detail = item.isChange ? changeDetail(text) : null;
        }
      }
    }
  }

  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    items,
    pending: pending.map((action) => ({ toolUseId: action.toolUseId, toolName: action.toolName, ...action.preview })),
  };
}
