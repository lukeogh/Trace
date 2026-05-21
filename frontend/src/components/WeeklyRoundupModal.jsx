import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import Modal from './Modal'
import { areasApi } from '../api/client'

export default function WeeklyRoundupModal({ isOpen, onClose }) {
  const [phase, setPhase] = useState('loading')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [dotStep, setDotStep] = useState(0)
  const [generatedAt, setGeneratedAt] = useState('')

  useEffect(() => {
    if (phase !== 'loading') return
    const id = setInterval(() => setDotStep((s) => (s + 1) % 3), 600)
    return () => clearInterval(id)
  }, [phase])

  const handleGenerate = async () => {
    setPhase('loading')
    setError('')
    setText('')
    try {
      const data = await areasApi.getRoundupData()
      setGeneratedAt(data.generated_at)
      const result = await areasApi.generateRoundup({
        areas: data.areas,
        period_days: data.period_days,
        generated_at: data.generated_at,
      })
      setText(result.text)
      setPhase('review')
    } catch (e) {
      const msg = e.message || 'Unknown error'
      setError(
        msg.includes('ANTHROPIC_API_KEY')
          ? 'API key not configured — add ANTHROPIC_API_KEY to your .env file and rebuild.'
          : msg
      )
      setPhase('error')
    }
  }

  useEffect(() => {
    if (isOpen) handleGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const formattedDate = generatedAt
    ? format(new Date(generatedAt), 'dd MMM yyyy')
    : format(new Date(), 'dd MMM yyyy')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Weekly Roundup" width="max-w-2xl">
      {phase === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-150 ${
                  i === dotStep
                    ? 'bg-signal-500'
                    : 'bg-navy-200 dark:bg-navy-700'
                }`}
              />
            ))}
          </div>
          <p className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500">
            Generating weekly roundup…
          </p>
        </div>
      )}

      {phase === 'review' && (
        <div>
          <p className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500 mb-3">
            Weekly Roundup — W/E {formattedDate}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="
              w-full min-h-[320px] px-3 py-2.5 rounded-lg text-sm font-sans leading-relaxed resize-y
              bg-navy-50 dark:bg-navy-800
              border border-navy-200 dark:border-navy-600
              text-navy-800 dark:text-navy-100
              focus:outline-none focus:ring-2 focus:ring-signal-500 focus:border-transparent
            "
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={handleCopy}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wide transition-colors
                bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300
                hover:bg-navy-200 dark:hover:bg-navy-700
              "
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={onClose}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wide transition-colors
                bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300
                hover:bg-navy-200 dark:hover:bg-navy-700
              "
            >
              Close
            </button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="py-6 flex flex-col items-center gap-4">
          <p className="text-sm text-red-500 text-center">{error}</p>
          <button
            onClick={handleGenerate}
            className="
              px-4 py-2 rounded-md text-xs font-display uppercase tracking-wide transition-colors
              bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300
              hover:bg-navy-200 dark:hover:bg-navy-700
            "
          >
            Try again
          </button>
        </div>
      )}
    </Modal>
  )
}
