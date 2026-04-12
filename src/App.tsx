import { useMemo, useState, useEffect, useRef, type ChangeEvent } from 'react'
import Sidebar from './components/Sidebar'

type UIFontKey = 'inter' | 'open_sans' | 'lora' | 'raleway'

const UI_FONT_STACK: Record<UIFontKey, string> = {
  inter: "'Inter', 'SF Pro Text', 'SF Pro Display', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  open_sans: "'Open Sans', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  lora: "'Lora', Georgia, 'Times New Roman', serif",
  raleway: "'Raleway', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
}

const is_ui_font_key = (value: string | null): value is UIFontKey =>
  value === 'inter' || value === 'open_sans' || value === 'lora' || value === 'raleway'

export default function App() {
  const env_api_key = ''
  const chatEndRef = useRef<HTMLDivElement>(null)
  const webContextCacheRef = useRef<Map<string, string>>(new Map())
  const [is_dark_mode, set_is_dark_mode] = useState(false)
  const [is_model_settings_open, set_is_model_settings_open] = useState(false)
  const [is_search_context_open, set_is_search_context_open] = useState(false)
  const [is_searching_context, set_is_searching_context] = useState(false)
  const [ui_font_key, set_ui_font_key] = useState<UIFontKey>(() => {
    const saved_font_key = localStorage.getItem('ui_font_key')
    return is_ui_font_key(saved_font_key) ? saved_font_key : 'inter'
  })
  const [model_provider_key, set_model_provider_key] = useState<ModelProviderKey>(() => {
    const saved_provider = localStorage.getItem('model_provider_key')
    return saved_provider === 'gemma' ? 'gemma' : 'qwen'
  })

  const [source_document_list, set_source_document_list] = useState<SourceDocument[]>([])
  const [uploaded_file_payload_list, set_uploaded_file_payload_list] = useState<UploadedFilePayload[]>([])

  ])
  const [note_input, set_note_input] = useState('')
  const [direct_url_input, set_direct_url_input] = useState('')
  const [is_adding_direct_url, set_is_adding_direct_url] = useState(false)
  const [qwen_api_key, set_qwen_api_key] = useState(() =>
    localStorage.getItem('groq_api_key') || env_api_key || ''
  )
  const [gemma_api_key, set_gemma_api_key] = useState(() =>
    localStorage.getItem('gemma_api_key') || ''
  )
  const [gemini_api_key, set_gemini_api_key] = useState(() =>
    localStorage.getItem('gemini_api_key') || ''
  )
  const [is_processing, set_is_processing] = useState(false)
  const [is_generating, set_is_generating] = useState(false)
  const [error_text, set_error_text] = useState('')

  useEffect(() => {
    load_pdfjs()
  }, [])

  useEffect(() => {
    const saved_theme = localStorage.getItem('theme_mode')
    if (saved_theme === 'dark') {
      set_is_dark_mode(true)
      return
    }
    if (saved_theme === 'light') {
      set_is_dark_mode(false)
      return
    }
    const prefers_dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    set_is_dark_mode(prefers_dark)
  }, [])

  useEffect(() => {
    localStorage.setItem('model_provider_key', model_provider_key)
  }, [model_provider_key])

  useEffect(() => {
    localStorage.setItem('groq_api_key', qwen_api_key)
  }, [qwen_api_key])

  useEffect(() => {
    localStorage.setItem('gemma_api_key', gemma_api_key)
  }, [gemma_api_key])

  useEffect(() => {
    localStorage.setItem('gemini_api_key', gemini_api_key)
  }, [gemini_api_key])

  useEffect(() => {
    localStorage.setItem('ui_font_key', ui_font_key)
    document.documentElement.style.setProperty('--font-sans', UI_FONT_STACK[ui_font_key])
  }, [ui_font_key])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chat_message_list])

  const total_character_count = useMemo(() => {
    const local_character_count = source_document_list.reduce((sum_value, doc_item) => sum_value + doc_item.content.length, 0)
    const web_character_count = ready_web_source_list.reduce(
      (sum_value, web_item) => sum_value + (web_source_context_size_map[web_item.url] || 0),
      0
    )
    return local_character_count + web_character_count
  }, [source_document_list, ready_web_source_list, web_source_context_size_map])

  const context_chunk_list = useMemo(
    () => build_context_chunk_list(source_document_list),
    [source_document_list]
  )

  const on_file_upload = async (event_item: ChangeEvent<HTMLInputElement>) => {
    const file_list = event_item.target.files
    if (!file_list?.length) return

    set_error_text('')
    set_is_processing(true)

    try {
      const upload_result = await process_uploaded_files(Array.from(file_list))
      const fresh_doc_list = upload_result.source_document_list
      const fresh_file_payload_list = upload_result.uploaded_file_payload_list

      if (fresh_file_payload_list.length) {
        set_uploaded_file_payload_list((prev_list) => [...fresh_file_payload_list, ...prev_list])
      }

      if (!fresh_doc_list.length && !fresh_file_payload_list.length) {
        set_error_text('Could not extract text from selected files.')
      } else {
        set_source_document_list((prev_list) => [...fresh_doc_list, ...prev_list])
      }
    } catch (error_item) {
      set_error_text(error_item instanceof Error ? error_item.message : 'Failed to process files.')
    } finally {
      set_is_processing(false)
      event_item.target.value = ''
    }
  }

  const add_note_document = () => {
    const note_document = create_note_source_document(note_input)
    if (!note_document) return
    set_source_document_list((prev_list) => [note_document, ...prev_list])
    set_note_input('')
  }

  const add_direct_url_source = async () => {
    const normalized_url = normalize_source_url(direct_url_input)
    if (!normalized_url) {
      set_error_text('Please enter a valid URL.')
      return
    }

    let parsed_url: URL
    try {
      parsed_url = new URL(normalized_url)
    } catch {
      set_error_text('Please enter a valid URL.')
      return
    }

    set_error_text('')
    set_is_adding_direct_url(true)

    try {
      await add_web_source_with_prefetch({
        title: parsed_url.hostname.replace(/^www\./, '') || 'Direct URL',
        description: 'Added via direct URL input',
        url: parsed_url.toString(),
      })
      set_direct_url_input('')
    } finally {
      set_is_adding_direct_url(false)
    }
  }

  const ask_question = async (input_question_text: string) => {
    const cleaned_question = clean_text(input_question_text)
    if (!cleaned_question || is_generating) return

    const user_message: ChatMessage = { id: make_id(), role: 'user', text: cleaned_question }
    const next_chat_message_list = [...chat_message_list, user_message]
    set_chat_message_list(next_chat_message_list)
    set_is_generating(true)

    try {
      const result_item = await execute_model_query({
        model_provider_key,
        question_text: cleaned_question,
        api_key_by_provider: {
          qwen: qwen_api_key,
          gemma: gemma_api_key,
          gemini: gemini_api_key,
        },
        source_document_list,
        context_chunk_list,
        uploaded_file_payload_list,
        selected_web_source_list: ready_web_source_list,
        chat_message_list: next_chat_message_list,
        web_context_cache_map: webContextCacheRef.current,
      })

      set_chat_message_list((prev) => [
        ...prev,
        {
          id: make_id(),
          role: 'assistant',
          text: result_item.text,
          citation_list: result_item.citation_list,
        },
      ])
    } catch (error_item) {
      const errorMsg = error_item instanceof Error ? error_item.message : 'Unknown error'
      set_chat_message_list((prev) => [
        ...prev,
        {
          id: make_id(),
          role: 'assistant',
          text: `Failed to connect to language model (${errorMsg}). Please try again.`,
        },
      ])
    } finally {
      set_is_generating(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-app c-text-primary font-ui overflow-hidden">
      <Sidebar
       add_direct_url_source={() => void add_direct_url_source()}
        on_note_input_change={set_note_input}
        add_note_document={add_note_document}
      />

      <CenterChat
        chat_message_list={chat_message_list}
        is_generating={is_generating}
        ask_question={ask_question}
        chat_end_ref={chatEndRef}
      />

      <KnowledgeBasePanel
        web_source_status_map={web_source_status_map}
        on_remove_web_source={remove_web_source}
      />

      <ModelSettingsModal
        is_open={is_model_settings_open}
        model_provider_key={model_provider_key}
        model_name={MODEL_NAME_BY_PROVIDER[model_provider_key]}
        provider_api_key={
          model_provider_key === 'gemma'
            ? gemma_api_key
            : model_provider_key === 'gemini'
              ? gemini_api_key
              : qwen_api_key
        }
        selected_ui_font_key={ui_font_key}
        on_close={() => set_is_model_settings_open(false)}
        on_model_provider_change={set_model_provider_key}
        on_provider_api_key_change={(value) => {
          if (model_provider_key === 'gemma') {
            set_gemma_api_key(value)
            return
          }
          if (model_provider_key === 'gemini') {
            set_gemini_api_key(value)
            return
          }
          set_qwen_api_key(value)
        }}
        on_ui_font_change={set_ui_font_key}
      />
    </div>
  )
}
