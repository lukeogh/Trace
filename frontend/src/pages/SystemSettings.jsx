import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings as SettingsIcon, ArrowLeft, Cpu, FolderOpen, RefreshCw,
  AlertCircle, Download, Zap, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, Loader2, ExternalLink,
} from 'lucide-react'
import {
  isTauri,
  getDataDir,
  pickDataDir,
  migrateAndSetDataDir,
  relaunch,
  getUpdateChannel,
  setUpdateChannel,
} from '../api/tauri'
import {
  getAIConfig, getAIPresets, saveAIConfig, testAIConfig,
} from '../api/settings'
import { useAppVersion } from '../hooks/useAppVersion'

/**
 * System Settings — a dedicated page (was a popover; promoted because
 * it now houses the AI engine wizard, data storage, updates, and About).
 *
 * Layout: one card per concern, stacked. AI Engine sits at the top
 * because it's the most-changed setting and most consequential to AI
 * features working at all.
 *
 * The AI Engine card stays collapsed (summary view) until the user clicks
 * "Set up" / "Change" — only then does the three-step wizard appear,
 * inline on the page. Keeping the wizard inline (not in a sub-modal)
 * avoids the "modal-on-popover" stacking that the popover version had,
 * which fights with the way ADHD brains track state.
 */
export default function SystemSettings({ updater }) {
  return (
    <div className="flex-1 min-h-screen bg-paper-100 dark:bg-pitch-800 bg-grid-light dark:bg-grid-dark">
      <header className="
        sticky top-0 z-10 px-8 py-5
        bg-paper-100/90 dark:bg-pitch-800/90 backdrop-blur-md
        border-b border-paper-300 dark:border-pitch-700
      ">
        <div className="max-w-3xl mx-auto pr-14">
          <Link
            to="/"
            className="
              inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest
              text-paper-500 dark:text-paper-600
              hover:text-pitch-700 dark:hover:text-paper-200
              transition-colors mb-3
            "
          >
            <ArrowLeft size={11} /> Back
          </Link>
          <div className="flex items-center gap-3">
            <SettingsIcon size={22} className="text-paper-500 dark:text-paper-600" />
            <div>
              <h1 className="font-display font-medium text-3xl tracking-tight text-pitch-800 dark:text-white leading-tight">
                System settings
              </h1>
              <p className="text-xs font-mono uppercase tracking-[0.25em] text-paper-500 dark:text-paper-600 mt-1">
                Infrastructure · how Trace. stores and updates itself
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-8 space-y-6">
        <AISection />
        {isTauri() && <UpdateSection updater={updater} />}
        {isTauri() && <DataStorageSection />}
        <AboutSection />
      </main>
    </div>
  )
}

// ─── AI Engine ────────────────────────────────────────────────────────────────

function AISection() {
  const [config, setConfig] = useState(null)
  const [editing, setEditing] = useState(false)

  const refresh = () => {
    getAIConfig().then(setConfig).catch(() => setConfig(null))
  }

  useEffect(() => { refresh() }, [])

  return (
    <Card>
      <CardHeader
        icon={Cpu}
        title="AI Engine"
        subtitle="Powers smart capture, area summaries, and the weekly roundup."
      />

      {!editing && (
        <AISummaryCard
          config={config}
          onEdit={() => setEditing(true)}
        />
      )}

      {editing && (
        <AIWizard
          currentConfig={config}
          onCancel={() => setEditing(false)}
          onSaved={() => { setEditing(false); refresh() }}
        />
      )}
    </Card>
  )
}

function AISummaryCard({ config, onEdit }) {
  // Three visual states:
  //   1. Loading — config is null + we haven't decided yet (skip dot)
  //   2. Unconfigured — show prompt + "Set up" CTA
  //   3. Configured — show provider/model/masked key + "Change" button
  if (config === null) {
    return (
      <div className="text-xs text-paper-500 dark:text-paper-600 italic">
        Loading…
      </div>
    )
  }

  if (!config.is_configured) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-paper-100 dark:bg-pitch-800 border border-paper-300 dark:border-pitch-500">
        <div className="flex items-start gap-3 min-w-0">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-pitch-800 dark:text-white">
              AI not configured yet
            </p>
            <p className="text-xs text-paper-500 dark:text-paper-600 mt-0.5">
              Smart capture and area summaries need an AI provider to work.
            </p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="
            flex-shrink-0 px-4 py-2 rounded-md text-xs
            bg-mint-700 hover:bg-mint-800 text-white
            font-display uppercase tracking-wide transition-colors
          "
        >
          Set up
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-paper-100 dark:bg-pitch-800 border border-paper-300 dark:border-pitch-500">
      <div className="flex items-start gap-3 min-w-0">
        <span className="w-2 h-2 rounded-full bg-mint flex-shrink-0 mt-2" aria-label="Configured" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-pitch-800 dark:text-white capitalize">
            {config.provider}
          </p>
          <p className="text-[11px] font-mono text-paper-500 dark:text-paper-600 mt-0.5 truncate">
            {config.model || '(default model)'}
            {config.api_key_masked && (
              <> · <span className="text-paper-400 dark:text-paper-700">{config.api_key_masked}</span></>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={onEdit}
        className="
          flex-shrink-0 px-3 py-1.5 rounded-md text-xs
          text-paper-700 dark:text-paper-300
          hover:bg-paper-200 dark:hover:bg-pitch-700
          font-display uppercase tracking-wide transition-colors
        "
      >
        Change
      </button>
    </div>
  )
}

// ─── AI Wizard (inline on the page) ───────────────────────────────────────────

// Per-provider guide content. Same copy as the kit's modal version, just
// reflowed onto the page. Keeping it as data makes future copy edits a
// one-place change.
const GUIDES = {
  claude: {
    badge: 'Paid',
    icon: '🟠',
    what: "The AI built into Trace. by default. Strongest results for smart capture, area summaries, and the weekly roundup. Needs an Anthropic API key.",
    time: 'About 3 minutes',
    steps: [
      { text: 'Go to', link: { label: 'console.anthropic.com', url: 'https://console.anthropic.com' } },
      { text: 'Click API Keys in the left sidebar' },
      { text: 'Click Create Key — copy it and paste below' },
    ],
    keyLabel: 'Anthropic API key',
    keyHint: 'Starts with "sk-ant-"',
    keyPlaceholder: 'sk-ant-••••••••••',
    urlNeeded: false,
    modelLabel: 'Model',
    modelHint: 'Leave as default unless you have a specific reason to change.',
    defaultModel: 'claude-sonnet-4-6',
  },
  groq: {
    badge: 'Free tier',
    icon: '⚡',
    what: "Fast, free AI service. The free tier gives you 14,400 requests per day — more than enough for personal use. No credit card required.",
    time: 'About 2 minutes',
    steps: [
      { text: 'Go to', link: { label: 'console.groq.com', url: 'https://console.groq.com' }, suffix: 'and sign up (free)' },
      { text: 'Click API Keys in the left menu' },
      { text: 'Click Create API Key — copy it and paste below' },
    ],
    keyLabel: 'Groq API key',
    keyHint: 'Starts with "gsk_"',
    keyPlaceholder: 'gsk_••••••••••',
    urlNeeded: false,
    modelLabel: 'Model',
    modelHint: 'llama-3.1-8b-instant is fast and free. llama-3.3-70b-versatile is better quality, still free.',
    defaultModel: 'llama-3.1-8b-instant',
  },
  gemini: {
    badge: 'Free tier',
    icon: '✦',
    what: "Google's AI. Gemini 1.5 Flash is free with no billing required. Good general-purpose model for summaries and extraction.",
    time: 'About 2 minutes',
    steps: [
      { text: 'Go to', link: { label: 'aistudio.google.com', url: 'https://aistudio.google.com' } },
      { text: 'Click Get API key (top left of the page)' },
      { text: 'Click Create API key — copy it and paste below' },
    ],
    keyLabel: 'Gemini API key',
    keyHint: 'Starts with "AIza"',
    keyPlaceholder: 'AIza••••••••••',
    urlNeeded: false,
    modelLabel: 'Model',
    modelHint: 'gemini-1.5-flash is free and fast. gemini-1.5-pro has better quality but lower free limits.',
    defaultModel: 'gemini-1.5-flash',
  },
  ollama: {
    badge: '100% local',
    icon: '🦙',
    what: "Runs entirely on your machine. No account, no API key, no cost, and your data never leaves your device. Requires Ollama installed locally.",
    time: 'About 5 minutes (plus model download)',
    steps: [
      { text: 'Go to', link: { label: 'ollama.com/download', url: 'https://ollama.com/download' }, suffix: 'and install Ollama' },
      { text: 'Open a terminal and run:', code: 'ollama pull llama3' },
      { text: 'Click Test below — no key needed' },
    ],
    keyLabel: null,
    urlNeeded: false,
    modelLabel: 'Model',
    modelHint: 'Must match a model you have pulled. Run "ollama list" to see what\'s available.',
    defaultModel: 'llama3',
  },
  custom: {
    badge: 'Enterprise',
    icon: '⚙️',
    what: "Any service with an OpenAI-compatible API. Use this for Azure OpenAI, OpenRouter, or a private model your organisation provides.",
    time: 'Details from your provider or IT team',
    steps: [
      { text: 'Get the base URL from your provider (e.g. your Azure OpenAI endpoint)' },
      { text: 'Get your API key from the same place' },
      { text: 'Enter the model name your provider has given you access to' },
    ],
    keyLabel: 'API key',
    keyHint: 'From your provider or IT team',
    keyPlaceholder: 'Enter your API key',
    urlNeeded: true,
    urlLabel: 'Base URL',
    urlHint: 'e.g. https://your-resource.openai.azure.com/openai or https://openrouter.ai/api/v1',
    urlPlaceholder: 'https://…',
    modelLabel: 'Model name',
    modelHint: 'Exact model name as given by your provider.',
    defaultModel: '',
  },
}

const PROVIDER_ORDER = ['claude', 'groq', 'gemini', 'ollama', 'custom']

function AIWizard({ currentConfig, onCancel, onSaved }) {
  // Stage: 'pick' (provider selection) or 'setup' (guide + form + test/save)
  const [stage, setStage] = useState(currentConfig?.is_configured ? 'setup' : 'pick')
  const [selected, setSelected] = useState(currentConfig?.provider || 'claude')
  const [presets, setPresets] = useState({})
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAIPresets().then(setPresets).catch(() => {})
  }, [])

  // When the user picks a provider, reset all the form fields to defaults
  // — model defaults to the preset's default, URL defaults to preset's URL,
  // API key is blank (user must enter or echo the existing masked one).
  useEffect(() => {
    const guide = GUIDES[selected] || GUIDES.custom
    const preset = presets[selected] || {}
    // If user is editing the CURRENTLY configured provider, prefill the
    // masked key + actual model so they can verify or tweak without
    // retyping. The PUT endpoint detects the masked echo and preserves
    // the stored key.
    if (currentConfig && currentConfig.provider === selected) {
      setApiKey(currentConfig.api_key_masked || '')
      setBaseUrl(currentConfig.base_url || preset.base_url || '')
      setModel(currentConfig.model || preset.default_model || guide.defaultModel || '')
    } else {
      setApiKey('')
      setBaseUrl(preset.base_url || '')
      setModel(preset.default_model || guide.defaultModel || '')
    }
    setTestResult(null)
    setError('')
  }, [selected, presets, currentConfig])

  const guide = GUIDES[selected] || GUIDES.custom
  const preset = presets[selected] || {}

  function buildConfig() {
    return {
      provider: selected,
      model: model || guide.defaultModel || null,
      base_url: baseUrl || preset.base_url || null,
      api_key: apiKey || null,
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    setError('')
    try {
      const result = await testAIConfig(buildConfig())
      setTestResult(result)
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await saveAIConfig(buildConfig())
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Validation: Ollama doesn't need a key. Custom needs both. Masked echo
  // counts as having a key (the server will substitute the real one).
  const keyOK = (selected === 'ollama')
    ? true
    : (apiKey.length > 4 || (apiKey && [...apiKey].every(c => c === '•')))
  const urlOK = guide.urlNeeded ? baseUrl.length > 4 : true
  const canTest = keyOK && urlOK
  const canSave = canTest && testResult?.ok === true

  if (stage === 'pick') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-paper-500 dark:text-paper-600">
          Pick a provider. You can change this any time.
        </p>
        <div className="space-y-1.5">
          {PROVIDER_ORDER.map((key) => {
            const g = GUIDES[key]
            return (
              <button
                key={key}
                onClick={() => { setSelected(key); setStage('setup') }}
                className="
                  w-full text-left rounded-lg border-2 p-3 transition-all
                  border-paper-200 dark:border-pitch-500
                  hover:border-mint dark:hover:border-mint
                  hover:bg-paper-100 dark:hover:bg-pitch-600/40
                "
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-paper-100 dark:bg-pitch-800">
                    {g.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-pitch-800 dark:text-white capitalize">
                        {key === 'gemini' ? 'Google Gemini' : key === 'custom' ? 'Custom / Enterprise' : key}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-paper-200 dark:bg-pitch-600 text-paper-700 dark:text-paper-300">
                        {g.badge}
                      </span>
                    </div>
                    <div className="text-xs text-paper-500 dark:text-paper-600 mt-0.5 leading-snug">
                      {g.what.split('.')[0]}.
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-paper-400 flex-shrink-0" />
                </div>
              </button>
            )
          })}
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={onCancel}
            className="text-xs text-paper-500 hover:text-paper-700 dark:hover:text-paper-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // stage === 'setup'
  return (
    <div className="space-y-4">
      <button
        onClick={() => setStage('pick')}
        className="flex items-center gap-1 text-xs text-paper-500 dark:text-paper-600 hover:text-pitch-700 dark:hover:text-paper-300 transition-colors"
      >
        <ChevronLeft size={12} /> Choose a different provider
      </button>

      {/* What is this */}
      <div className="rounded-lg p-3 bg-paper-100 dark:bg-pitch-800 border-l-4 border-mint">
        <div className="text-[10px] font-display uppercase tracking-widest text-mint-700 dark:text-mint-300 mb-1">
          {guide.icon} {selected === 'gemini' ? 'Google Gemini' : selected === 'custom' ? 'Custom / Enterprise' : selected.charAt(0).toUpperCase() + selected.slice(1)} · {guide.time}
        </div>
        <div className="text-xs text-pitch-700 dark:text-paper-300 leading-relaxed">{guide.what}</div>
      </div>

      {/* Steps */}
      {guide.steps && (
        <div>
          <div className="text-[10px] font-display uppercase tracking-widest text-paper-500 dark:text-paper-600 mb-2">
            {guide.keyLabel ? 'To get your key' : 'To get started'}
          </div>
          <div className="space-y-2">
            {guide.steps.map((s, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-mint-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="text-xs text-pitch-700 dark:text-paper-300 leading-relaxed">
                  {s.text}{' '}
                  {s.link && (
                    <a
                      href={s.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mint-700 dark:text-mint-300 font-medium hover:underline inline-flex items-center gap-0.5"
                    >
                      {s.link.label}
                      <ExternalLink size={10} />
                    </a>
                  )}
                  {s.suffix && ` ${s.suffix}`}
                  {s.code && (
                    <code className="ml-1 px-1.5 py-0.5 rounded bg-pitch-800 dark:bg-black text-mint-300 text-[11px] font-mono">
                      {s.code}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-paper-200 dark:border-pitch-500" />

      {guide.urlNeeded && (
        <Field
          label={guide.urlLabel || 'Base URL'}
          hint={guide.urlHint}
          value={baseUrl}
          onChange={(v) => { setBaseUrl(v); setTestResult(null) }}
          placeholder={guide.urlPlaceholder}
          type="url"
        />
      )}

      {guide.keyLabel && (
        <Field
          label={guide.keyLabel}
          hint={guide.keyHint}
          value={apiKey}
          onChange={(v) => { setApiKey(v); setTestResult(null) }}
          placeholder={guide.keyPlaceholder}
          type="password"
          autoComplete="off"
        />
      )}

      {guide.modelLabel && (
        <Field
          label={guide.modelLabel}
          hint={guide.modelHint}
          value={model}
          onChange={(v) => { setModel(v); setTestResult(null) }}
          placeholder={guide.defaultModel || 'Model name'}
        />
      )}

      <button
        onClick={handleTest}
        disabled={testing || !canTest}
        className="
          w-full flex items-center justify-center gap-2
          px-4 py-2.5 rounded-lg text-sm font-medium
          border-2 border-mint
          text-mint-700 dark:text-mint-300
          hover:bg-mint-50 dark:hover:bg-mint-900/20
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors
        "
      >
        {testing
          ? (<><Loader2 size={14} className="animate-spin" /> Testing…</>)
          : 'Test connection'
        }
      </button>

      {testResult && (
        <div className={`
          flex items-start gap-2 p-3 rounded-lg text-xs leading-snug
          ${testResult.ok
            ? 'bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-300 border border-mint/40'
            : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }
        `}>
          {testResult.ok
            ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
            : <XCircle size={14} className="flex-shrink-0 mt-0.5" />
          }
          {testResult.message}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="
            flex-1 flex items-center justify-center gap-2
            px-4 py-2.5 rounded-lg text-sm font-semibold
            bg-mint-700 hover:bg-mint-800
            text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {saving
            ? (<><Loader2 size={14} className="animate-spin" /> Saving…</>)
            : 'Save and use this engine'
          }
        </button>
        <button
          onClick={onCancel}
          className="
            px-4 py-2.5 rounded-lg text-sm
            text-paper-700 dark:text-paper-300
            hover:bg-paper-200 dark:hover:bg-pitch-700
            transition-colors
          "
        >
          Cancel
        </button>
      </div>

      {!testResult?.ok && (
        <p className="text-center text-[10px] text-paper-500 dark:text-paper-600">
          Test the connection first to enable Save.
        </p>
      )}
    </div>
  )
}

function Field({ label, hint, value, onChange, placeholder, type = 'text', autoComplete }) {
  return (
    <div>
      <label className="text-xs font-medium text-pitch-700 dark:text-paper-300 block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="
          w-full px-3 py-2 rounded-lg text-sm font-mono
          bg-paper-100 dark:bg-pitch-800
          border border-paper-300 dark:border-pitch-500
          text-pitch-800 dark:text-white
          placeholder:text-paper-400 dark:placeholder:text-paper-700
          focus:outline-none focus:ring-2 focus:ring-mint-500
        "
      />
      {hint && (
        <p className="mt-1 text-[10px] text-paper-500 dark:text-paper-600">{hint}</p>
      )}
    </div>
  )
}

// ─── Update channel ───────────────────────────────────────────────────────────

function UpdateSection({ updater }) {
  const [channel, setChannel] = useState('stable')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!isTauri()) return
    getUpdateChannel().then(setChannel)
  }, [])

  const handle = async (next) => {
    if (next === channel) return
    setPending(true)
    try {
      await setUpdateChannel(next)
      setChannel(next)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader
        icon={Download}
        title="Updates"
        subtitle="Where Trace. looks for new versions. Restart after switching."
      />

      {/* Available banner — same UX as the toast, just permanently surfaced
          on the settings page. Visible for 'available' AND 'dismissed' so
          the cog → settings path always shows the install option. */}
      {(updater?.status === 'available' || updater?.status === 'dismissed') && updater.available && (
        <div className="
          rounded-lg p-3 mb-4
          bg-mint-50 dark:bg-mint-900/20
          border border-mint/40
        ">
          <div className="flex items-start gap-2 mb-2">
            <Zap size={14} className="flex-shrink-0 mt-0.5 text-mint" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display uppercase tracking-wide text-mint-700 dark:text-mint-300">
                Update available
              </p>
              <p className="text-sm text-pitch-700 dark:text-paper-300 mt-0.5">
                {updater.available.currentVersion} → <strong>{updater.available.version}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={updater.install}
            className="
              w-full flex items-center justify-center gap-1.5
              px-3 py-2 rounded-md text-xs
              bg-mint-700 hover:bg-mint-800 text-white
              font-display uppercase tracking-wide transition-colors
            "
          >
            <Download size={11} />
            Install &amp; restart
          </button>
        </div>
      )}

      {updater?.status === 'downloading' && (
        <div className="rounded-lg p-3 mb-4 bg-mint-50 dark:bg-mint-900/20 border border-mint/40 flex items-center gap-2">
          <Download size={12} className="text-mint animate-pulse" />
          <p className="text-xs text-pitch-700 dark:text-paper-300">
            Downloading update
            {updater.progress?.contentLength
              ? ` (${Math.round(100 * updater.progress.downloaded / updater.progress.contentLength)}%)`
              : '…'}
          </p>
        </div>
      )}

      {updater?.status === 'error' && (
        <div className="rounded-lg p-3 mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-2">
          <AlertCircle size={11} className="flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs text-red-500 leading-snug">
            Update failed: {updater.error}
          </p>
        </div>
      )}

      <div className="text-[10px] font-display uppercase tracking-widest text-paper-500 dark:text-paper-600 mb-1.5">
        Channel
      </div>
      <Segmented
        value={channel}
        options={[
          { key: 'stable', label: 'Stable' },
          { key: 'beta',   label: 'Beta' },
        ]}
        onChange={handle}
      />
      {pending && (
        <p className="mt-1 text-[10px] text-paper-500 dark:text-paper-600">Saving…</p>
      )}
      <p className="mt-2 text-xs text-paper-500 dark:text-paper-600 leading-snug">
        Beta gets new builds with every merge to main. Restart Trace.
        after switching for the change to take effect.
      </p>
    </Card>
  )
}

// ─── Data storage ─────────────────────────────────────────────────────────────

function DataStorageSection() {
  const [dataDir, setDataDir] = useState(null)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState('')
  const [restartPending, setRestartPending] = useState(false)

  useEffect(() => {
    if (!isTauri()) return
    getDataDir().then(setDataDir)
  }, [])

  const handleChange = async () => {
    setError('')
    try {
      const chosen = await pickDataDir()
      if (!chosen) return
      setMigrating(true)
      await migrateAndSetDataDir(chosen)
      setDataDir(chosen)
      setRestartPending(true)
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Migration failed. Your data was not moved.')
    } finally {
      setMigrating(false)
    }
  }

  return (
    <Card>
      <CardHeader
        icon={FolderOpen}
        title="Data storage"
        subtitle="Where your database and uploads live. Changing copies your data — the old folder is not deleted."
      />

      {restartPending ? (
        <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-2 leading-snug">
            Data moved. Trace. needs to restart to use the new location.
          </p>
          <button
            onClick={relaunch}
            className="
              w-full flex items-center justify-center gap-1.5
              px-3 py-2 rounded-md text-xs
              bg-amber-500 hover:bg-amber-600 text-white
              font-display uppercase tracking-wide transition-colors
            "
          >
            <RefreshCw size={11} />
            Restart now
          </button>
        </div>
      ) : (
        <>
          <div className="
            flex items-center gap-3 px-3 py-2.5 rounded-lg
            bg-paper-100 dark:bg-pitch-800
            border border-paper-300 dark:border-pitch-500
          ">
            <FolderOpen size={13} className="flex-shrink-0 text-paper-500 dark:text-paper-600" />
            <span
              className="flex-1 text-xs font-mono truncate text-pitch-700 dark:text-paper-300"
              title={dataDir || ''}
            >
              {dataDir || '…'}
            </span>
            <button
              onClick={handleChange}
              disabled={migrating}
              className="
                flex-shrink-0 px-3 py-1.5 rounded-md text-xs
                text-paper-700 dark:text-paper-300
                hover:bg-paper-200 dark:hover:bg-pitch-700
                disabled:opacity-40 transition-colors
                font-display uppercase tracking-wide
              "
            >
              {migrating ? 'Moving…' : 'Change…'}
            </button>
          </div>
          {error && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs text-red-500 leading-snug">{error}</p>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

function AboutSection() {
  const version = useAppVersion()
  return (
    <Card>
      <CardHeader icon={SettingsIcon} title="About" />
      <dl className="space-y-1.5 text-sm">
        <Row label="Version" value={version ? `v${version}` : '—'} />
      </dl>
    </Card>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-paper-500 dark:text-paper-600">{label}</dt>
      <dd className="font-mono text-pitch-700 dark:text-paper-300">{value}</dd>
    </div>
  )
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function Card({ children }) {
  return (
    <section className="
      rounded-xl border p-5
      bg-white dark:bg-pitch-700
      border-paper-300 dark:border-pitch-500
    ">
      {children}
    </section>
  )
}

function CardHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <Icon size={16} className="flex-shrink-0 mt-1 text-paper-500 dark:text-paper-600" />
      <div className="flex-1 min-w-0">
        <h2 className="font-display font-medium text-base text-pitch-800 dark:text-white leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-paper-500 dark:text-paper-600 mt-1 leading-snug">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md w-full bg-paper-100 dark:bg-pitch-800 border border-paper-300 dark:border-pitch-500">
      {options.map((opt) => {
        const active = opt.key === value
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors
              ${active
                ? 'bg-white dark:bg-pitch-700 text-pitch-800 dark:text-white shadow-sm'
                : 'text-paper-600 dark:text-paper-500 hover:text-pitch-700 dark:hover:text-paper-200'
              }
            `}
          >
            <span className="font-display uppercase tracking-wide text-xs">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
