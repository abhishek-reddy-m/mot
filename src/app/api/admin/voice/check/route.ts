import { requireStaff } from '@/server/authz';
import { handleRoute, json } from '@/server/http';
import { checkVoiceModels, voiceConfigured } from '@/server/voice/live';

export const dynamic = 'force-dynamic';

/** GET — can the configured OpenAI key use the voice and reasoning models? */
export const GET = handleRoute(async () => {
  await requireStaff('voice.manage');
  if (!voiceConfigured()) return json({ key: false, models: [] });
  return json({ key: true, models: await checkVoiceModels() });
});
