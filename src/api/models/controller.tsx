import {
  get_top_chunk_list_from_chunks,
  make_citation_list,
  make_local_fallback_answer,
  type ChatMessage,
  type Citation,
  type ContextChunk,
  type SourceDocument,
  type UploadedFilePayload,
} from '../rag'
import { ask_qwen_with_context } from './qwen'
import { ask_gemma_with_files } from './gemma'
import { ask_gemini_with_web_context } from './gemini'
import { build_web_context_block, type WebContextSource } from './webContext'

export type ModelProviderKey = 'qwen' | 'gemma' | 'gemini'

export const MODEL_NAME_BY_PROVIDER: Record<ModelProviderKey, string> = {
  qwen: 'openai/gpt-oss-120b',
  gemma: 'gemma-4-31b-it',
  gemini: 'gemini-flash-lite-latest',
}

interface ModelExecutionInput {
  model_provider_key: ModelProviderKey
  question_text: string
  api_key_by_provider: Record<ModelProviderKey, string>
  source_document_list: SourceDocument[]
  context_chunk_list: ContextChunk[]
  uploaded_file_payload_list: UploadedFilePayload[]
  selected_web_source_list: WebContextSource[]
  chat_message_list: ChatMessage[]
  web_context_cache_map: Map<string, string>
}

interface ModelExecutionResult {
  text: string
  citation_list?: Citation[]
}

interface ConversationTurn {
  role: 'user' | 'model'
  text: string
}

const build_conversation_history = (chat_message_list: ChatMessage[]): string => {
  const relevant_messages = chat_message_list.slice(-8)
  if (!relevant_messages.length) return ''

  return relevant_messages
    .map((message_item) => `${message_item.role === 'user' ? 'User' : 'Assistant'}: ${message_item.text}`)
    .join('\n')
}

const build_conversation_turn_list = (chat_message_list: ChatMessage[]): ConversationTurn[] => {
  const relevant_messages = chat_message_list.slice(-8)
  return relevant_messages
    .filter((message_item) => message_item.text.trim())
    .map((message_item) => ({
      role: message_item.role === 'assistant' ? 'model' : 'user',
      text: message_item.text,
    }))
}

export const execute_model_query = async (input_item: ModelExecutionInput): Promise<ModelExecutionResult> => {
  const conversation_history_text = build_conversation_history(input_item.chat_message_list)
  const conversation_turn_list = build_conversation_turn_list(input_item.chat_message_list.slice(0, -1))
  const model_name = MODEL_NAME_BY_PROVIDER[input_item.model_provider_key]

  let web_context_text = ''
  if (input_item.selected_web_source_list.length) {
    web_context_text = await build_web_context_block(
      input_item.selected_web_source_list,
      input_item.web_context_cache_map
    )
  }

  const top_chunk_list = get_top_chunk_list_from_chunks(input_item.question_text, input_item.context_chunk_list, 8)
  const citation_list = top_chunk_list.length ? make_citation_list(top_chunk_list) : undefined
  const document_context_text = top_chunk_list
    .slice(0, 6)
    .map((chunk_item, index_value) => `[Chunk ${index_value + 1} | ${chunk_item.doc_name}] ${chunk_item.chunk_text}`)
    .join('\n\n')

  if (input_item.model_provider_key === 'qwen') {
    const qwen_api_key = input_item.api_key_by_provider.qwen.trim()
    if (!qwen_api_key) {
      if (top_chunk_list.length) {
        return {
          text: `[No Qwen API Key provided. Here is the raw context found:]\n\n${make_local_fallback_answer(top_chunk_list)}`,
          citation_list,
        }
      }
      return {
        text: 'Please add your Qwen API key in Model Settings.',
      }
    }

    if (!top_chunk_list.length && !web_context_text) {
      return {
        text: 'I could not find relevant information in your current documents or selected web sources. Try rephrasing.',
      }
    }

    const answer_text = await ask_qwen_with_context({
      question_text: input_item.question_text,
      top_chunk_list,
      qwen_api_key,
      model_name,
      web_context_text,
      conversation_history_text,
    })

    return {
      text: answer_text,
      citation_list,
    }
  }

  if (input_item.model_provider_key === 'gemma') {
    const gemma_api_key = input_item.api_key_by_provider.gemma.trim()

    // if (!has_any_source) {
    //   return {
    //     text: 'Please add at least one source (uploaded document, note, or selected web source) first.',
    //   }
    // }

    if (!gemma_api_key) {
      if (top_chunk_list.length) {
        return {
          text: `[No Gemma API Key provided. Here is the raw context found:]\n\n${make_local_fallback_answer(top_chunk_list)}`,
          citation_list,
        }
      }
      return {
        text: 'Please add your Gemma API key in Model Settings.',
      }
    }

    const note_context_list = input_item.source_document_list
      .filter((doc_item) => doc_item.source_type === 'note')
      .map((doc_item) => doc_item.content)

    const answer_text = await ask_gemma_with_files({
      question_text: input_item.question_text,
      model_name,
      gemma_api_key,
      uploaded_file_payload_list: input_item.uploaded_file_payload_list,
      note_context_list,
      document_context_text,
      web_context_text,
      conversation_turn_list,
    })

    return {
      text: answer_text,
      citation_list,
    }
  }

  const gemini_api_key = input_item.api_key_by_provider.gemini.trim()
  if (!gemini_api_key) {
    return {
      text: 'Please add your Gemini API key in Model Settings.',
    }
  }

  const answer_text = await ask_gemini_with_web_context({
    question_text: input_item.question_text,
    model_name,
    gemini_api_key,
    web_context_text,
    document_context_text,
    conversation_turn_list,
  })

  return {
    text: answer_text,
    citation_list,
  }
}
