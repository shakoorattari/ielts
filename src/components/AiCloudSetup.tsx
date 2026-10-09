import { useState } from 'react';
import { describeAiError } from '../lib/chromeAi';
import {
  PROVIDERS,
  clearCloudSettings,
  listModels,
  pickDefaultModel,
  providerLabel,
  saveCloudSettings,
  testConnection,
  useCloudAi,
  type ProviderKey,
} from '../lib/cloudAi';

const inputCls = 'w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-brand-500';

/**
 * Lets a learner use the AI coach with their own free key when Chrome's on-device AI isn't available
 * (phones, tablets, Safari, Firefox). The key stays in this browser. Nothing is sent until they agree.
 */
export function AiCloudSetup({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const saved = useCloudAi();
  const [provider, setProvider] = useState<ProviderKey>('groq');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [modelEdit, setModelEdit] = useState(saved?.model ?? '');

  if (saved) {
    return (
      <div className="mt-3 rounded-lg border border-line bg-canvas p-3 text-sm text-ink">
        <p className="font-semibold">Using your own {providerLabel(saved)} key</p>
        <p className="mt-1 text-ink-soft">
          Key ending …{saved.apiKey.slice(-4)}. When you press a ✨ button, your writing is sent to {providerLabel(saved)} to get the
          feedback. This site never stores it. Your key stays in this browser only.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-soft" htmlFor="ai-model-edit">
          Model
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input id="ai-model-edit" value={modelEdit} onChange={(e) => setModelEdit(e.target.value)} className={`${inputCls} max-w-xs`} />
          <button
            type="button"
            disabled={!modelEdit.trim() || modelEdit.trim() === saved.model}
            onClick={() => saveCloudSettings({ ...saved, model: modelEdit.trim() })}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-brand-700 hover:border-brand-300 disabled:opacity-40"
          >
            Update model
          </button>
          <button
            type="button"
            onClick={clearCloudSettings}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-rose-ink hover:border-rose-ink"
          >
            Remove key
          </button>
        </div>
      </div>
    );
  }

  const info = PROVIDERS[provider];
  const custom = provider === 'custom';
  const urlOk = !custom || /^https:\/\/[^\s/]+/.test(baseUrl.trim());
  const canSave = consent && apiKey.trim().length > 8 && urlOk && (!custom || model.trim().length > 0) && !busy;

  async function save() {
    setBusy(true);
    setError('');
    const draft = { provider, apiKey: apiKey.trim(), baseUrl: baseUrl.trim(), model: model.trim() };
    try {
      if (!draft.model) {
        try {
          draft.model = pickDefaultModel(provider, await listModels(draft));
        } catch (e) {
          const status = (e as { status?: number }).status;
          if (status === 401 || status === 403) throw e; // the key itself is wrong
          draft.model = PROVIDERS[provider].defaultModel;
        }
      }
      await testConnection(draft);
      saveCloudSettings({ ...draft, consent: true });
      setApiKey('');
    } catch (e) {
      setError(describeAiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details open={defaultOpen} className="mt-3 rounded-lg border border-line bg-canvas p-3 text-sm text-ink">
      <summary className="cursor-pointer font-semibold text-brand-700">Use a free AI key instead (works on phones, tablets and any browser)</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-ink-soft">
          Create your own free key with an AI service, paste it here, and the coach will use it. It costs nothing, and the key stays in
          this browser only.
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Service</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderKey)} className={inputCls}>
            <option value="groq">Groq (recommended)</option>
            <option value="gemini">Google Gemini</option>
            <option value="custom">Other (OpenAI-compatible)</option>
          </select>
        </label>

        {info.keyUrl && (
          <div>
            <a
              href={info.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-full border border-line px-3 py-1.5 font-semibold text-brand-700 hover:border-brand-300"
            >
              1. Get a free {info.label} key ↗
            </a>
            <ol className="mt-2 list-decimal pl-5 text-ink-soft">
              <li>The link opens in a new tab. Sign in (a Google account works).</li>
              <li>Tap “Create API key”, then copy the key it shows you.</li>
              <li>Come back to this tab, paste the key below and tick the box.</li>
              <li>Press “Save and test”. After that, every ✨ button works.</li>
            </ol>
          </div>
        )}

        {custom && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Address (must start with https://)</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
              inputMode="url"
              autoCapitalize="off"
              spellCheck={false}
              className={inputCls}
            />
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Your API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Paste your key"
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Model {custom ? '' : '(optional: we pick a fast one for you)'}
          </span>
          <input value={model} onChange={(e) => setModel(e.target.value)} autoCapitalize="off" spellCheck={false} className={inputCls} />
        </label>

        <p className="rounded-lg bg-amber-100 px-3 py-2 text-amber-ink">{info.privacy}</p>

        <label className="flex items-start gap-2">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-brand-500" />
          <span>
            I understand that when I press a ✨ button, my writing is sent to {custom ? 'this service' : info.label} to get feedback, and I
            won’t include personal information.
          </span>
        </label>

        {error && (
          <p className="text-rose-ink" role="alert">
            {error}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-600 disabled:opacity-40"
          >
            {busy ? 'Testing your key…' : 'Save and test'}
          </button>
        </div>
      </div>
    </details>
  );
}
