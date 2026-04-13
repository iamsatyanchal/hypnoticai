import { useEffect, useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import { AudioLines, ArrowUp, Sparkles, FerrisWheel } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeKatex from 'rehype-katex'
import type { ChatMessage } from '../api/rag'
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  h1: ({ children }) => <h1 className="t-lg fw-semibold c-text-primary mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="t-lg fw-semibold c-text-primary mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="t-base fw-semibold c-text-primary mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="t-base fw-semibold c-text-primary mb-1">{children}</h4>,
  h5: ({ children }) => <h5 className="t-base fw-medium c-text-primary mb-1">{children}</h5>,
  h6: ({ children }) => <h6 className="t-base fw-medium c-text-secondary mb-1">{children}</h6>,
  strong: ({ children }) => <strong className="fw-semibold c-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="opacity-80">{children}</del>,
  hr: () => <hr className="my-3.5 border-subtle" />,
  br: () => <br />,
  code: ({ className, children }) => {
    const is_block = Boolean(className)
    if (is_block) {
      return (
        <code className="block whitespace-pre-wrap break-words c-text-primary">
          {children}
        </code>
      )
    }
    return <code className="rounded bg-panel px-1 py-0.5">{children}</code>
  },
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-panel p-3">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="mb-2 border-l-2 border-subtle pl-3 c-text-secondary">{children}</blockquote>,
  thead: ({ children }) => <thead className="bg-panel">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-subtle">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 t-base fw-semibold c-text-primary">{children}</th>,
  td: ({ children }) => <td className="border-t border-subtle px-3 py-2 t-base fw-regular c-text-secondary align-top">{children}</td>,
  img: ({ src, alt }) => (
    <img src={src || ''} alt={alt || 'markdown image'} className="my-2 max-w-full rounded-lg border border-subtle" />
  ),
  a: ({ href, children }) => (
    <a href={href} className="underline c-text-primary" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
}

const normalize_markdown_text = (raw_markdown_text: string) =>
  raw_markdown_text
    // Convert LaTeX \[ ... \] blocks into markdown display math $$...$$
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, math_expression: string) => `\n$$\n${math_expression}\n$$\n`)
    // Convert bracket-style block math [ ... ] (on separate lines) into $$...$$
    .replace(/(^|\n)\[\s*\n([\s\S]*?)\n\]\s*(?=\n|$)/g, (_whole: string, prefix: string, math_expression: string) => `${prefix}$$\n${math_expression}\n$$`)
    // Convert escaped ATX headings like \### Title into ### Title
    .replace(/^(\s{0,3})\\(#{1,6})\s+(.*)$/gm, '$1$2 $3')
    // Normalize compact headings like ###Title into ### Title
    .replace(/^(\s{0,3})(#{1,6})([^\s#].*)$/gm, '$1$2 $3')

interface CenterChatProps {
  chat_message_list: ChatMessage[]
  is_generating: boolean
  ask_question: (input_question_text: string) => Promise<void>
  chat_end_ref: RefObject<HTMLDivElement | null>
}

export default function CenterChat({
  chat_message_list,
  is_generating,
  ask_question,
  chat_end_ref,
}: CenterChatProps) {
  const [draft_question_text, set_draft_question_text] = useState('')
  const [markdown_render_epoch, set_markdown_render_epoch] = useState(0)

  useEffect(() => {
    if (!is_generating) {
      // Re-mount markdown renderer when a response completes so plugins parse fresh output.
      set_markdown_render_epoch((prev_value) => prev_value + 1)
    }
  }, [is_generating, chat_message_list.length])

  const submit_question = () => {
    const cleaned_input = draft_question_text.trim()
    if (!cleaned_input || is_generating) return
    set_draft_question_text('')
    void ask_question(cleaned_input)
  }

  const handle_question_key_down = (event_item: KeyboardEvent<HTMLInputElement>) => {
    if (event_item.key === 'Enter' && !event_item.shiftKey) {
      event_item.preventDefault()
      submit_question()
    }
  }

  const rendered_message_list = useMemo(
    () =>
      chat_message_list.map((message_item) => {
        if (message_item.role === 'user') {
          return (
            <div key={message_item.id} className="flex w-full justify-end pt-5">
              <div className="bg-panel border border-subtle c-text-primary px-4 py-2.5 rounded-2xl rounded-br-sm t-base fw-medium max-w-[80%]">
                {message_item.text}
              </div>
            </div>
          )
        }

        return (
          <div key={message_item.id} className="w-full flex flex-col c-text-primary space-y-4">
            <div>
              <div className="flex items-center gap-1.5 t-lg fw-semibold c-text-primary mb-2">
                <FerrisWheel size={19} strokeWidth={1.8} className="mb-0.5 icon-secondary" /> Answer
              </div>
              <div className="t-base fw-regular c-text-primary">
                {(() => {
                  const quiz_question_list = parse_quiz_question_list(message_item.text)
                  const graph_payload = parse_graph_payload(message_item.text)
                  const clean_answer_text = remove_structured_blocks(message_item.text)

                  return (
                    <>
                <ReactMarkdown
                  key={`${message_item.id}_${message_item.text.length}_${markdown_render_epoch}`}
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
                  components={MARKDOWN_COMPONENTS}
                >
                      {normalize_markdown_text(clean_answer_text || message_item.text)}
                </ReactMarkdown>
                      {graph_payload ? <InsightGraph graph_payload={graph_payload} /> : null}
                      {quiz_question_list.length ? <QuickQuiz question_list={quiz_question_list} /> : null}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* {message_item.citation_list?.length ? (
              <div>
                <div className="flex items-center gap-2 t-lg fw-semibold c-text-primary mb-3">
                  <Link2 size={18} className="icon-secondary" /> Sources
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {message_item.citation_list.map((cite_item, cite_index) => (
                    <div
                      key={`${cite_item.doc_name}_${cite_index}`}
                      className="flex items-center gap-3 px-2.5 py-1.5 bg-surface border border-subtle rounded-xl cursor-default max-w-[240px]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="t-base fw-medium c-text-primary truncate">{cite_item.doc_name}</p>
                        <p className="t-sm fw-regular c-text-muted truncate">Local Document • {cite_index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null} */}
          </div>
        )
      }),
    [chat_message_list, markdown_render_epoch]
  )

  return (
    <main className="flex-1 flex flex-col h-full bg-main relative min-w-0">
      <header className="h-12 border-b border-subtle justify-center flex items-center px-6 flex-shrink-0 bg-main z-10 sticky top-0">
        <h1 className="t-lg fw-semibold c-text-primary">Start where you are. Use what you have. Do what you can.</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth mb-[3rem] pb-32 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {rendered_message_list}

          {is_generating && (
            <div className="w-full flex items-center gap-2 c-text-muted t-base fw-medium py-4">
              <Sparkles size={16} className="animate-pulse" />
              Generating response...
            </div>
          )}
          <div ref={chat_end_ref} />
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none z-20">
        <div className="w-full max-w-3xl bg-surface border border-subtle rounded-full p-1.5 flex items-center pointer-events-auto">
          <button className="p-2.5 icon-muted c-text-primary transition-colors rounded-full">
            <AudioLines size={18} />
          </button>
          <input
            value={draft_question_text}
            onChange={(event_item) => set_draft_question_text(event_item.target.value)}
            onKeyDown={handle_question_key_down}
            placeholder="Ask follow up question"
            className="input-ui flex-1 bg-transparent border-none px-2 t-base fw-regular c-text-primary focus:outline-none"
          />
          <div className="flex items-center gap-4 pr-1">
            {/* <div className="hidden sm:flex items-center gap-2 t-sm fw-medium c-text-muted">
              <span>Citation</span>
              <div className="w-8 h-4 bg-panel rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-surface rounded-full"></div>
              </div>
            </div> */}
            <button
              onClick={submit_question}
              disabled={is_generating || !draft_question_text.trim()}
              className="w-9 h-9 rounded-full btn-primary flex items-center justify-center transition-colors"
            >
              <ArrowUp size={16} strokeWidth={2.5}/>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
