import type { MouseEvent } from 'react'
import { X, Settings } from 'lucide-react'

type UIFontKey = 'inter' | 'open_sans' | 'lora' | 'raleway'
type ModelProviderKey = 'qwen' | 'gemma' | 'gemini'

const MODEL_PRESET_LIST: Array<{ key: ModelProviderKey; label: string; subtitle: string }> = [
  {
    key: 'qwen',
    label: 'Qwen',
    subtitle: 'Context-aware RAG via chunk retrieval',
  },
  {
    key: 'gemma',
    label: 'Gemma',
    subtitle: 'Direct file upload reasoning (inlineData)',
  },
  {
    key: 'gemini',
    label: 'Gemini Flash Lite',
    subtitle: 'Web mode with urlContext + webSearch',
  },
]

const FONT_PRESET_LIST: Array<{ key: UIFontKey; label: string; preview_style: string }> = [
  {
    key: 'open_sans',
    label: 'Open Sans',
    preview_style: "'Open Sans', sans-serif",
  },
  {
    key: 'inter',
    label: 'Inter',
    preview_style: "'Inter', sans-serif",
  },
  {
    key: 'lora',
    label: 'Lora',
    preview_style: "'Lora', serif",
  },
  {
    key: 'raleway',
    label: 'Raleway',
    preview_style: "'Raleway', sans-serif",
  },
]

interface ModelSettingsModalProps {
  is_open: boolean
  model_provider_key: ModelProviderKey
  model_name: string
  provider_api_key: string
  selected_ui_font_key: UIFontKey
  on_close: () => void
  on_model_provider_change: (value: ModelProviderKey) => void
  on_provider_api_key_change: (value: string) => void
  on_ui_font_change: (value: UIFontKey) => void
}

export default function ModelSettingsModal({
  is_open,
  model_provider_key,
  model_name,
  provider_api_key,
  selected_ui_font_key,
  on_close,
  on_model_provider_change,
  on_provider_api_key_change,
  on_ui_font_change,
}: ModelSettingsModalProps) {
  if (!is_open) return null

  const close_on_backdrop = (event_item: MouseEvent<HTMLDivElement>) => {
    if (event_item.target === event_item.currentTarget) {
      on_close()
    }
  }

  return (
    <div
      onClick={close_on_backdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
    >
      <div className="w-full max-w-xl rounded-2xl border border-subtle bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="t-lg fw-semibold c-text-primary flex items-center gap-2">
            <Settings size={16} className="icon-secondary" /> Model Settings
          </h2>
          <button
            onClick={on_close}
            className="rounded-md p-1.5 c-text-secondary hover-surface transition-colors"
            aria-label="Close model settings"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="t-sm fw-medium c-text-secondary block mb-2">Model Selection</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODEL_PRESET_LIST.map((model_item) => {
                const is_active = model_provider_key === model_item.key
                return (
                  <button
                    key={model_item.key}
                    type="button"
                    onClick={() => on_model_provider_change(model_item.key)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      is_active ? 'bg-muted border-medium c-text-primary' : 'bg-surface border-subtle c-text-secondary hover-surface'
                    }`}
                  >
                    <span className="block t-base fw-medium">{model_item.label}</span>
                    <span className="mt-0.5 block t-sm fw-regular c-text-muted">{model_item.subtitle}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-1 t-sm fw-regular c-text-muted">Active model id: {model_name}</p>
          </div>

          <div>
            <label className="t-sm fw-medium c-text-secondary block mb-1">
              {model_provider_key === 'gemma'
                ? 'Gemma API Key'
                : model_provider_key === 'gemini'
                  ? 'Gemini API Key'
                  : 'Qwen API Key'}
            </label>
            <input
              value={provider_api_key}
              onChange={(event_item) => on_provider_api_key_change(event_item.target.value)}
              type="password"
              placeholder="Paste key here..."
              className="input-ui w-full rounded-md border border-subtle bg-surface px-3 py-2 t-base fw-regular c-text-primary focus:outline-none focus:border-medium"
            />
          </div>

          <div>
            <label className="t-sm fw-medium c-text-secondary block mb-2">Font Selection</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FONT_PRESET_LIST.map((font_item) => {
                const is_active = selected_ui_font_key === font_item.key
                return (
                  <button
                    key={font_item.key}
                    type="button"
                    onClick={() => on_ui_font_change(font_item.key)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      is_active ? 'bg-muted border-medium c-text-primary' : 'bg-surface border-subtle c-text-secondary hover-surface'
                    }`}
                  >
                    <span
                      className="block t-base fw-medium"
                      style={{ fontFamily: font_item.preview_style }}
                    >
                      {font_item.label}
                    </span>
                    <span className="mt-0.5 block t-sm fw-regular c-text-muted">
                      Aa Bb Cc 123
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={on_close}
            className="rounded-md border border-subtle px-3 py-1.5 t-base fw-medium c-text-primary hover-surface transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
