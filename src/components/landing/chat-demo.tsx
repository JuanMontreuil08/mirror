'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const EXCHANGES = [
  {
    user: 'Am I too concentrated in tech?',
    mirror: 'NVDA and AMZN are 41% of your portfolio.\nWant to see what rebalancing looks like?',
  },
  {
    user: 'Why is my portfolio up today?',
    mirror: 'NVDA is up 2.3%. It\'s your largest position — that\'s doing most of the work.',
  },
]

type Phase = 'idle' | 'typing-user' | 'pause-after-user' | 'typing-mirror' | 'pause-after-mirror' | 'fade-out'

export default function ChatDemo() {
  const prefersReduced = useReducedMotion()
  const [turn, setTurn] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [userText, setUserText] = useState('')
  const [mirrorText, setMirrorText] = useState('')
  const [cardOpacity, setCardOpacity] = useState(1)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function schedule(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
  }
  function clearAll() { timers.current.forEach(clearTimeout); timers.current = [] }
  function typeString(str: string, msPerChar: number, setter: (s: string) => void, onDone: () => void) {
    let i = 0
    function next() { i++; setter(str.slice(0, i)); if (i < str.length) schedule(next, msPerChar); else onDone() }
    schedule(next, msPerChar)
  }

  useEffect(() => {
    clearAll()
    const exchange = EXCHANGES[turn % EXCHANGES.length]
    if (prefersReduced) { setUserText(exchange.user); setMirrorText(exchange.mirror); setCardOpacity(1); return }
    setUserText(''); setMirrorText(''); setCardOpacity(1)
    schedule(() => {
      setPhase('typing-user')
      typeString(exchange.user, 40, setUserText, () => {
        setPhase('pause-after-user')
        schedule(() => {
          setPhase('typing-mirror')
          typeString(exchange.mirror, 25, setMirrorText, () => {
            setPhase('pause-after-mirror')
            schedule(() => {
              setCardOpacity(0)
              schedule(() => { setTurn(t => (t + 1) % EXCHANGES.length); setPhase('idle') }, 400)
            }, 2200)
          })
        }, 800)
      })
    }, turn === 0 ? 1400 : 200)
    return () => clearAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, prefersReduced])

  const exchange = EXCHANGES[turn % EXCHANGES.length]

  return (
    <motion.div
      className="w-full rounded-2xl p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: cardOpacity, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.6 }}
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.80)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
      }}
    >
      <div className="flex justify-end mb-4">
        <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[88%] text-right"
          style={{ background: 'var(--color-cta)', color: '#fff' }}>
          {userText || <span className="opacity-0">{exchange.user}</span>}
          {phase === 'typing-user' && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-white/70 animate-pulse align-middle" />}
        </div>
      </div>

      <div className="flex justify-start mb-3">
        <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[92%]"
          style={{ background: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.70)',
            color: 'var(--color-text)', whiteSpace: 'pre-line', minHeight: '2.75rem' }}>
          {mirrorText || (phase === 'typing-mirror' ? '' : <span className="opacity-0">{exchange.mirror}</span>)}
          {phase === 'typing-mirror' && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-current opacity-40 animate-pulse align-middle" />}
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--color-text-faint)' }}>Mirror</p>
    </motion.div>
  )
}
