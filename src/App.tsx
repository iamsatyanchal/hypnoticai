import { useMemo, useState, useEffect, useRef, type ChangeEvent } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import CenterChat from './components/CenterChat'
import KnowledgeBasePanel from './components/KnowledgeBasePanel'
import ModelSettingsModal from './components/ModelSettingsModal'
import SearchContextModal from './components/SearchContextModal'
import SignInPage from './auth/SignInPage'
import SignUpPage from './auth/SignUpPage'
import {
  build_context_chunk_list,
  clean_text,
  load_pdfjs,
  make_id,
  type ChatMessage,
  type SourceDocument,
  type UploadedFilePayload,
} from './api/rag'
import { execute_model_query, MODEL_NAME_BY_PROVIDER, type ModelProviderKey } from './api/models/controller'
import { process_uploaded_files, create_note_source_document } from './api/models/workspace'
import { fetch_and_cache_web_context, normalize_source_url, search_web_context, type WebContextSource } from './api/models/webContext'

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
  const [web_search_result_list, set_web_search_result_list] = useState<WebContextSource[]>([])
  const [selected_web_source_list, set_selected_web_source_list] = useState<WebContextSource[]>([])
  const [web_source_status_map, set_web_source_status_map] = useState<Record<string, 'loading' | 'ready' | 'error'>>({})
  const [web_source_context_size_map, set_web_source_context_size_map] = useState<Record<string, number>>({})
  const [chat_message_list, set_chat_message_list] = useState<ChatMessage[]>([
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
    document.documentElement.dataset.theme = is_dark_mode ? 'dark' : 'light'
    localStorage.setItem('theme_mode', is_dark_mode ? 'dark' : 'light')
  }, [is_dark_mode])

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

  const ready_web_source_list = useMemo(
    () => selected_web_source_list.filter((source_item) => web_source_status_map[source_item.url] === 'ready'),
    [selected_web_source_list, web_source_status_map]
  )

  const indexed_source_count = useMemo(
    () => source_document_list.length + ready_web_source_list.length,
    [source_document_list.length, ready_web_source_list.length]
  )

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

  const on_search_context = async (query_text: string) => {
    set_is_searching_context(true)
    set_error_text('')
    try {
      const result_list = await search_web_context(query_text)
      set_web_search_result_list(result_list)
      if (!result_list.length) {
        set_error_text('No search results found for this query.')
      }
    } catch (error_item) {
      set_error_text(error_item instanceof Error ? error_item.message : 'Failed to fetch search context.')
    } finally {
      set_is_searching_context(false)
    }
  }

  const remove_web_source = (url_value: string) => {
    set_selected_web_source_list((prev_list) => prev_list.filter((item) => item.url !== url_value))
    set_web_source_status_map((prev_map) => {
      const next_map = { ...prev_map }
      delete next_map[url_value]
      return next_map
    })
    set_web_source_context_size_map((prev_map) => {
      const next_map = { ...prev_map }
      delete next_map[url_value]
      return next_map
    })
  }

  const add_web_source_with_prefetch = async (source_item: WebContextSource) => {
    const already_selected = selected_web_source_list.some((item) => item.url === source_item.url)
    if (already_selected) return

    set_selected_web_source_list((prev_list) => [source_item, ...prev_list])
    set_web_source_status_map((prev_map) => ({
      ...prev_map,
      [source_item.url]: 'loading',
    }))

    try {
      const context_text = await fetch_and_cache_web_context(source_item.url, webContextCacheRef.current)
      set_web_source_status_map((prev_map) => ({
        ...prev_map,
        [source_item.url]: context_text ? 'ready' : 'error',
      }))
      set_web_source_context_size_map((prev_map) => ({
        ...prev_map,
        [source_item.url]: context_text.length,
      }))
    } catch {
      set_web_source_status_map((prev_map) => ({
        ...prev_map,
        [source_item.url]: 'error',
      }))
      set_web_source_context_size_map((prev_map) => ({
        ...prev_map,
        [source_item.url]: 0,
      }))
    }
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

  const on_toggle_web_source = async (source_item: WebContextSource) => {
    const already_selected = selected_web_source_list.some((item) => item.url === source_item.url)

    if (already_selected) {
      remove_web_source(source_item.url)
      return
    }

    await add_web_source_with_prefetch(source_item)
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

  const home_page = (
    <div className="flex h-screen w-full bg-app c-text-primary font-ui overflow-hidden">
      <Sidebar
        source_document_count={indexed_source_count}
        total_character_count={total_character_count}
        is_dark_mode={is_dark_mode}
        is_processing={is_processing}
        is_adding_direct_url={is_adding_direct_url}
        error_text={error_text}
        direct_url_input={direct_url_input}
        note_input={note_input}
        on_open_search_context={() => set_is_search_context_open(true)}
        on_toggle_dark_mode={() => set_is_dark_mode((prev_value) => !prev_value)}
        on_open_model_settings={() => set_is_model_settings_open(true)}
        on_file_upload={on_file_upload}
        on_direct_url_input_change={set_direct_url_input}
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
        source_document_list={source_document_list}
        web_source_list={selected_web_source_list}
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

      <SearchContextModal
        is_open={is_search_context_open}
        is_searching={is_searching_context}
        search_result_list={web_search_result_list}
        selected_web_source_list={selected_web_source_list}
        web_source_status_map={web_source_status_map}
        on_close={() => set_is_search_context_open(false)}
        on_search={on_search_context}
        on_toggle_source={on_toggle_web_source}
      />
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={home_page} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}