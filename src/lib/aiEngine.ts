import { useChromeAi, askOnDevice, getOnDeviceState } from './chromeAi';
import { cloudAskJson, isCloudReady, providerLabel, useCloudAi } from './cloudAi';

/*
 * One door for the AI coach. Chrome's on-device model is preferred (it keeps the writing on the learner's
 * computer); where that isn't available, a learner who has set up their own free key uses that instead.
 */

export type AiMode = 'on-device' | 'cloud' | 'none';

export function currentMode(): AiMode {
  if (getOnDeviceState().kind === 'ready') return 'on-device';
  return isCloudReady() ? 'cloud' : 'none';
}

export function askJson<T>(opts: { key: string; system: string; prompt: string; schema: object; signal?: AbortSignal }): Promise<T> {
  const mode = currentMode();
  if (mode === 'on-device') return askOnDevice<T>(opts);
  if (mode === 'cloud') return cloudAskJson<T>(opts);
  return Promise.reject(Object.assign(new Error('The AI coach is not set up yet.'), { name: 'AiFormatError' }));
}

/** React: which engine is active, and who receives the text when it is the cloud one. */
export function useAiMode(): { mode: AiMode; provider: string } {
  const { state } = useChromeAi();
  const cloud = useCloudAi();
  if (state.kind === 'ready') return { mode: 'on-device', provider: '' };
  if (cloud) return { mode: 'cloud', provider: providerLabel(cloud) };
  return { mode: 'none', provider: '' };
}
