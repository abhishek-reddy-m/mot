export type VoiceState = 'idle' | 'connecting' | 'live' | 'ending' | 'error';

export interface Caption {
  id: string;
  role: 'user' | 'agent';
  text: string;
}

export interface VoiceToolCall {
  name: string;
  arguments: string;
  callId: string;
}

export interface VoiceOptions {
  propertyId: string | undefined;
  audience: 'guest' | 'staff';
  /** Run a tool the voice asked for and return its JSON-serialisable output. */
  onToolCall: (call: VoiceToolCall, ctx: { token: string }) => Promise<unknown>;
  onStateChange?: (s: VoiceState) => void;
}

/** What every voice provider hook returns; components only use this. */
export interface VoiceController {
  state: VoiceState;
  error: string | null;
  captions: Caption[];
  muted: boolean;
  level: number;
  agentSpeaking: boolean;
  working: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggleMute: () => void;
  clearError: () => void;
}
