import { useEffect, useMemo, useState } from 'react'
import { ClipboardPen, Check, X } from 'lucide-react';

export interface QuizQuestion {
  question: string
  options: string[]
  right_option_index: number
}

interface QuickQuizProps {
  question_list: QuizQuestion[]
}

export default function QuickQuiz({ question_list }: QuickQuizProps) {
  const [active_index, set_active_index] = useState(0)
  const [selected_option_indexes, set_selected_option_indexes] = useState<Array<number | null>>(() =>
    question_list.map(() => null),
  )

  const active_question = question_list[active_index]
  const selected_option_index = selected_option_indexes[active_index] ?? null
  const is_first_question = active_index === 0
  const is_last_question = active_index >= question_list.length - 1

  useEffect(() => {
    set_active_index(0)
    set_selected_option_indexes(question_list.map(() => null))
  }, [question_list])

  const score_value = useMemo(() => {
    return selected_option_indexes.reduce<number>((total_value, option_index, question_index) => {
      if (option_index === null) return total_value
      if (option_index === question_list[question_index]?.right_option_index) return total_value + 1
      return total_value
    }, 0)
  }, [selected_option_indexes, question_list])

  const select_option = (option_index: number) => {
    if (selected_option_index !== null) return
    set_selected_option_indexes((prev_indexes) => {
      const next_indexes = [...prev_indexes]
      next_indexes[active_index] = option_index
      return next_indexes
    })
  }

  const move_previous = () => {
    if (is_first_question) return
    set_active_index((prev_value) => prev_value - 1)
  }

  const move_next = () => {
    if (!active_question) return
    if (is_last_question) return
    set_active_index((prev_value) => prev_value + 1)
  }

  if (!active_question) return null

  return (
    <div className="mt-5 rounded-xl border border-subtle bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="t-base fw-semibold c-text-secondary tracking-wide flex items-center gap-1.5"><ClipboardPen size={16} className="icon" />Quick Test</p>
        <p className="t-base fw-medium c-text-muted">
          Q{active_index + 1}/{question_list.length} ~ Score: {score_value}
        </p>
      </div>

      <p className="mb-3 t-base fw-semibold c-text-primary">{active_question.question}</p>

      <div className="space-y-2">
        {active_question.options.map((option_item, option_index) => {
          const is_selected = selected_option_index === option_index
          const is_correct = option_index === active_question.right_option_index

          const state_class =
            selected_option_index === null
              ? 'border-subtle bg-panel hover-surface c-text-primary'
              : is_correct
                ? 'border-green-400 bg-green-300/20'
                : is_selected
                  ? 'border-red-400 bg-red-300/20'
                  : 'border-subtle bg-panel c-text-secondary opacity-80'
            const icon_answer = selected_option_index === null ? "" : is_correct ? <Check size={19} className="icon" /> : <X size={19} className="icon" />

          return (
            <button
              key={`${active_question.question}_${option_index}`}
              onClick={() => select_option(option_index)}
              disabled={selected_option_index !== null}
              className={`w-full rounded-lg border px-3 py-2 text-left t-base fw-regular transition-colors flex items-center gap-1.5 ${state_class}`}
            >
              {option_item} {icon_answer}
            </button>
          )
        })}
      </div>

      {/* {selected_option_index !== null ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p
            className={`px-1.5 rounded-md t-sm fw-medium ${
              is_correct_selection ? 'bg-green-300/90 text-green-900' : 'bg-red-300/90 text-red-900'
            }`}
          >
            {is_correct_selection ? 'Correct answer.' : 'Not correct. Review and continue.'}
          </p>
        </div>
      ) : null} */}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={move_previous}
          disabled={is_first_question}
          className="rounded-md border border-subtle px-2.5 py-1.5 t-sm fw-medium c-text-primary hover-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={move_next}
          disabled={is_last_question}
          className="rounded-md border border-subtle px-2.5 py-1.5 t-sm fw-medium c-text-primary hover-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
