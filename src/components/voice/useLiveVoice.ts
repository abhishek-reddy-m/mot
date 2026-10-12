'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { VoiceController, VoiceOptions } from './types';
import { useElevenLabsVoice } from './useElevenLabsVoice';
import { useOpenAIVoice } from './useOpenAIVoice';

export type { Caption, VoiceController, VoiceOptions, VoiceState, VoiceToolCall } from './types';

/**
 * The voice hook components use. The server picks the provider (ElevenLabs
 * or OpenAI GPT-Live, see /api/config); both expose the same controls and
 * run tools through the same `onToolCall`.
 */
export function useLiveVoice(options: VoiceOptions): VoiceController {
  const { data } = useSWR<{ voiceProvider?: 'openai' | 'elevenlabs' }>('/api/config', fetcher, { revalidateOnFocus: false });
  const openai = useOpenAIVoice(options);
  const elevenlabs = useElevenLabsVoice(options);
  return data?.voiceProvider === 'elevenlabs' ? elevenlabs : openai;
}
