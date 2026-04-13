import type { ChangeEvent } from 'react'
import { FileText, Search, BookOpenText, Database, Moon, Sun, SlidersHorizontal, FileUp, Plus, AlertCircle, Link2 } from 'lucide-react'

interface SidebarProps {
  source_document_count: number
  total_character_count: number
  is_dark_mode: boolean
  is_processing: boolean
  is_adding_direct_url: boolean
  error_text: string
  direct_url_input: string
  note_input: string
  on_open_search_context: () => void
  on_toggle_dark_mode: () => void
  on_open_model_settings: () => void
  on_file_upload: (event_item: ChangeEvent<HTMLInputElement>) => void
  on_direct_url_input_change: (value: string) => void
  add_direct_url_source: () => void
  on_note_input_change: (value: string) => void
  add_note_document: () => void
}

export default function Sidebar({
  source_document_count,
  total_character_count,
  is_dark_mode,
  is_processing,
  is_adding_direct_url,
  error_text,
  direct_url_input,
  note_input,
  on_open_search_context,
  on_toggle_dark_mode,
  on_open_model_settings,
  on_file_upload,
  on_direct_url_input_change,
  add_direct_url_source,
  on_note_input_change,
  add_note_document,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-panel border-r border-subtle flex flex-col h-screen flex-shrink-0">
      <div className="h-12 px-3 flex items-center gap-2 mb-2 border-b border-subtle">
        {/* <div className="w-6 h-6 rounded-md bg-logo c-text-inverse flex items-center justify-center t-sm fw-semibold">
          N
        </div> */}
        <span className="px-2.5 t-base fw-semibold c-text-primary tracking-tight">NoteForge</span>
      </div>

      <div className="px-3 space-y-0.5 flex-1">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 t-base fw-medium c-text-primary hover-surface rounded-md transition-colors">
          <BookOpenText size={16} className="icon-muted" />
          Study Session
        </button>
        <button
          onClick={on_open_search_context}
          className="w-full flex items-center gap-2 px-2 py-1.5 t-base fw-medium c-text-secondary hover-surface rounded-md transition-colors"
        >
          <Search size={16} className="icon-muted" />
          Search Context
        </button>

        <div className="pt-6 pb-2 px-2 t-sm fw-semibold c-text-secondary uppercase tracking-wider">
          Studyspace Stats
        </div>
        <div className="px-2 py-1.5 flex justify-between items-center t-base">
          <span className="c-text-secondary flex items-center gap-2">
            <Database size={14}/> Indexed
          </span>
          <span className="fw-medium c-text-primary">{source_document_count} files</span>
        </div>
        <div className="px-2 py-1.5 flex justify-between items-center t-base">
          <span className="c-text-secondary flex items-center gap-2">
            <FileText size={14}/> Data Size
          </span>
          <span className="fw-medium c-text-primary">~ {(total_character_count / 1000).toFixed(1)}k chars</span>
        </div>

        <div className="pt-5 pb-2 px-2 t-sm fw-semibold c-text-secondary uppercase tracking-wider">
          Inputs
        </div>
        <div className="px-2 space-y-2.5">
          <label
            htmlFor="source_upload"
            className={`h-13 flex flex-col items-center justify-center w-full p-3 border border-dashed rounded-lg cursor-pointer transition-colors ${
              is_processing ? 'bg-muted border-medium' : 'bg-surface border-medium hover-surface'
            }`}
          >
            <FileUp size={28} strokeWidth={1.3} className={is_processing ? 'icon-secondary animate-bounce' : 'icon-muted mb-1'} />
            <span className="mt-1.5 t-base fw-medium c-text-primary">
              {is_processing ? 'Processing...' : 'Upload PDF/TXT'}
            </span>
            <span className="t-sm fw-regular c-text-secondary text-center mt-1">Click to browse or drop</span>
          </label>
          <input id="source_upload" type="file" accept=".pdf,.txt,.md" multiple className="hidden" onChange={on_file_upload} disabled={is_processing} />

          <div className="relative">
            <input
              value={direct_url_input}
              onChange={(event_item) => on_direct_url_input_change(event_item.target.value)}
              placeholder="Paste URL & add source"
              className="input-ui w-full rounded-lg border border-subtle bg-surface p-2.5 pr-9 t-base fw-regular c-text-primary focus:outline-none focus:border-medium"
            />
            <button
              onClick={add_direct_url_source}
              disabled={is_adding_direct_url || !direct_url_input.trim()}
              className="absolute right-2 top-2 p-1.5 bg-panel hover-surface c-text-primary rounded-md transition-colors border border-subtle disabled:opacity-50"
              title="Add URL source"
            >
              {is_adding_direct_url ? <Link2 size={14} className="animate-pulse" /> : <Plus size={14} />}
            </button>
          </div>

          {error_text && (
            <div className="t-sm fw-medium danger flex items-start gap-1 p-2 rounded-md border">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error_text}</span>
            </div>
          )}

          <div className="relative">
            <textarea
              value={note_input}
              onChange={(event_item) => on_note_input_change(event_item.target.value)}
              placeholder="Paste text or notes here"
              className="input-ui w-full h-12 resize-none rounded-lg border border-subtle bg-surface p-3 t-base fw-regular c-text-primary focus:outline-none focus:border-medium"
            />
            <button
              onClick={add_note_document}
              disabled={!note_input.trim()}
              className="absolute right-2 bottom-3.5 p-1.5 bg-panel hover-surface c-text-primary rounded-md transition-colors border border-subtle disabled:opacity-50"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-subtle space-y-2">
        <button
          onClick={on_open_model_settings}
          className="w-full flex items-center justify-between px-2 py-1.5 t-base fw-medium c-text-primary hover-surface rounded-md transition-colors"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="icon-muted" />
            Model Settings
          </span>
        </button>
        <button
          onClick={on_toggle_dark_mode}
          className="w-full flex items-center justify-between px-2 py-1.5 t-base fw-medium c-text-primary hover-surface rounded-md transition-colors"
        >
          <span className="flex items-center gap-2">
            {is_dark_mode ? <Moon size={14} className="icon-muted" /> : <Sun size={14} className="icon-muted" />}
            Theme
          </span>
          <span className="t-sm c-text-secondary">{is_dark_mode ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </aside>
  )
}
