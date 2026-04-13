import {
  clean_text,
  extract_pdf_text,
  make_id,
  make_uploaded_file_payload,
  now_stamp,
  split_into_chunks,
  type SourceDocument,
  type SourceType,
  type UploadedFilePayload,
} from '../rag'

interface ProcessUploadResult {
  source_document_list: SourceDocument[]
  uploaded_file_payload_list: UploadedFilePayload[]
}

export const process_uploaded_files = async (file_list: File[]): Promise<ProcessUploadResult> => {
  const fresh_doc_list: SourceDocument[] = []
  const fresh_file_payload_list: UploadedFilePayload[] = []

  for (const file_item of file_list) {
    const file_name = file_item.name.toLowerCase()
    let extracted_text = ''
    let source_type: SourceType = 'text'

    fresh_file_payload_list.push(await make_uploaded_file_payload(file_item))

    if (file_name.endsWith('.pdf')) {
      source_type = 'pdf'
      extracted_text = await extract_pdf_text(file_item)
    } else {
      source_type = 'text'
      extracted_text = clean_text(await file_item.text())
    }

    if (!extracted_text) continue

    fresh_doc_list.push({
      id: make_id(),
      name: file_item.name,
      source_type,
      content: extracted_text,
      chunk_list: split_into_chunks(extracted_text),
      uploaded_at: now_stamp(),
    })
  }

  return {
    source_document_list: fresh_doc_list,
    uploaded_file_payload_list: fresh_file_payload_list,
  }
}

export const create_note_source_document = (note_input: string): SourceDocument | null => {
  const cleaned_note = clean_text(note_input)
  if (!cleaned_note) return null

  return {
    id: make_id(),
    name: `Note: ${cleaned_note.slice(0, 15)}...`,
    source_type: 'note',
    content: cleaned_note,
    chunk_list: split_into_chunks(cleaned_note),
    uploaded_at: now_stamp(),
  }
}
