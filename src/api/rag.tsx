export type SourceType = 'pdf' | 'text' | 'note'

export interface SourceDocument {
  id: string
  name: string
  source_type: SourceType
  content: string
  chunk_list: string[]
  uploaded_at: string
}

export interface UploadedFilePayload {
  id: string
  file_name: string
  mime_type: string
  data_base64: string
  uploaded_at: string
}

export interface Citation {
  doc_name: string
  snippet: string
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  citation_list?: Citation[]
}

export interface TopChunk {
  doc_name: string
  chunk_text: string
  score: number
}

export interface ContextChunk {
  doc_id: string
  doc_name: string
  chunk_text: string
  uploaded_at: string
  chunk_index: number
}

interface PdfTextContentItem {
  str?: string
}

interface PdfPage {
  getTextContent: () => Promise<{ items: PdfTextContentItem[] }>
}

interface PdfDocument {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPage>
}

interface PdfLoadingTask {
  promise: Promise<PdfDocument>
}

interface PdfJsLib {
  getDocument: (params: { data: ArrayBuffer }) => PdfLoadingTask
  GlobalWorkerOptions: {
    workerSrc: string
  }
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib
  }
}

export const now_stamp = () => new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
export const make_id = () => `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

export const clean_text = (raw_text: string) =>
  raw_text
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim()

export const split_into_chunks = (full_text: string): string[] => {
  const normalized_text = clean_text(full_text)
  if (!normalized_text) return []

  const sentence_list = normalized_text
    .split(/(?<=[.!?])\s+/)
    .map((sentence_item) => sentence_item.trim())
    .filter(Boolean)

  if (sentence_list.length <= 3) return [normalized_text]

  const chunk_list: string[] = []
  let current_chunk = ''

  sentence_list.forEach((sentence_item) => {
    const tentative_chunk = `${current_chunk} ${sentence_item}`.trim()
    if (tentative_chunk.length <= 420) {
      current_chunk = tentative_chunk
      return
    }
    if (current_chunk) chunk_list.push(current_chunk)
    current_chunk = sentence_item
  })

  if (current_chunk) chunk_list.push(current_chunk)
  return chunk_list
}

export const load_pdfjs = () => {
  if (typeof window === 'undefined' || window.pdfjsLib) return

  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
  script.async = true
  script.onload = () => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
  }
  document.body.appendChild(script)
}

export const extract_pdf_text = async (file_item: File): Promise<string> => {
  const pdf_lib = window.pdfjsLib
  if (!pdf_lib) throw new Error('PDF parser is still loading. Please try again in a second.')

  const file_buffer = await file_item.arrayBuffer()
  const pdf_doc = await pdf_lib.getDocument({ data: file_buffer }).promise
  const page_text_list: string[] = []

  for (let page_index = 1; page_index <= pdf_doc.numPages; page_index += 1) {
    const page_item = await pdf_doc.getPage(page_index)
    const text_content = await page_item.getTextContent()
    const joined_text = text_content.items
      .map((entry_item) => entry_item.str ?? '')
      .join(' ')
      .trim()
    if (joined_text) page_text_list.push(joined_text)
  }
  return clean_text(page_text_list.join(' '))
}

const array_buffer_to_base64 = (buffer_item: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer_item)
  let binary_text = ''
  const chunk_size = 0x8000

  for (let index_value = 0; index_value < bytes.length; index_value += chunk_size) {
    const chunk = bytes.subarray(index_value, index_value + chunk_size)
    binary_text += String.fromCharCode(...chunk)
  }

  return btoa(binary_text)
}

export const make_uploaded_file_payload = async (file_item: File): Promise<UploadedFilePayload> => {
  const file_buffer = await file_item.arrayBuffer()
  return {
    id: make_id(),
    file_name: file_item.name,
    mime_type: file_item.type || (file_item.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
    data_base64: array_buffer_to_base64(file_buffer),
    uploaded_at: now_stamp(),
  }
}

const score_chunk = (chunk_text: string, question_text: string) => {
  const question_term_list = clean_text(question_text)
    .toLowerCase()
    .split(' ')
    .filter((word_item) => word_item.length > 2)

  if (!question_term_list.length) return 0
  const low_chunk = chunk_text.toLowerCase()

  return question_term_list.reduce((score_value, term_item) => {
    if (low_chunk.includes(term_item)) return score_value + 1
    return score_value
  }, 0)
}

export const build_context_chunk_list = (source_list: SourceDocument[]): ContextChunk[] =>
  source_list.flatMap((doc_item) =>
    doc_item.chunk_list.map((chunk_item, chunk_index) => ({
      doc_id: doc_item.id,
      doc_name: doc_item.name,
      chunk_text: chunk_item,
      uploaded_at: doc_item.uploaded_at,
      chunk_index,
    }))
  )

const diversify_chunks_by_document = (scored_chunk_list: TopChunk[], max_chunk_count: number): TopChunk[] => {
  const doc_bucket_map = new Map<string, TopChunk[]>()

  scored_chunk_list.forEach((chunk_item) => {
    const bucket_key = chunk_item.doc_name
    const existing_bucket = doc_bucket_map.get(bucket_key)
    if (existing_bucket) {
      existing_bucket.push(chunk_item)
      return
    }
    doc_bucket_map.set(bucket_key, [chunk_item])
  })

  const doc_key_queue = Array.from(doc_bucket_map.keys())
  const diversified_list: TopChunk[] = []

  while (doc_key_queue.length > 0 && diversified_list.length < max_chunk_count) {
    for (let queue_index = 0; queue_index < doc_key_queue.length; queue_index += 1) {
      const doc_key = doc_key_queue[queue_index]
      const doc_bucket = doc_bucket_map.get(doc_key)
      if (!doc_bucket || !doc_bucket.length) {
        doc_key_queue.splice(queue_index, 1)
        queue_index -= 1
        continue
      }

      const next_chunk = doc_bucket.shift()
      if (next_chunk) diversified_list.push(next_chunk)

      if (!doc_bucket.length) {
        doc_key_queue.splice(queue_index, 1)
        queue_index -= 1
      }

      if (diversified_list.length >= max_chunk_count) break
    }
  }

  return diversified_list
}

export const get_top_chunk_list_from_chunks = (
  question_text: string,
  context_chunk_list: ContextChunk[],
  max_chunk_count = 8
): TopChunk[] => {
  const scored_chunk_list = context_chunk_list
    .map((context_item) => ({
      doc_name: context_item.doc_name,
      chunk_text: context_item.chunk_text,
      score: score_chunk(context_item.chunk_text, question_text),
    }))
    .sort((left_item, right_item) => right_item.score - left_item.score)

  const matched_chunk_list = scored_chunk_list.filter((chunk_item) => chunk_item.score > 0)

  if (matched_chunk_list.length > 0) {
    return diversify_chunks_by_document(matched_chunk_list, max_chunk_count)
  }

  // If no lexical match is found, keep multi-document context by taking early chunks from all docs.
  return diversify_chunks_by_document(scored_chunk_list, max_chunk_count)
}

export const get_top_chunk_list = (
  question_text: string,
  source_list: SourceDocument[],
  max_chunk_count = 8
): TopChunk[] => get_top_chunk_list_from_chunks(question_text, build_context_chunk_list(source_list), max_chunk_count)

export const make_citation_list = (top_chunk_list: TopChunk[]): Citation[] =>
  top_chunk_list.slice(0, 3).map((chunk_item) => ({
    doc_name: chunk_item.doc_name,
    snippet: `${chunk_item.chunk_text.slice(0, 180)}...`,
  }))

export const make_local_fallback_answer = (top_chunk_list: TopChunk[]) => {
  const stitched_context = top_chunk_list
    .slice(0, 3)
    .map((chunk_item, index_value) => `${index_value + 1}. ${chunk_item.chunk_text}`)
    .join(' ')

  return `Based on your documents:\n\n${stitched_context}`
}
