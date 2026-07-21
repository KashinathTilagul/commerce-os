'use client'

import { useState, useEffect } from 'react'

export function Calculator() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)

  const inputDigit = (d: string) => {
    if (waiting) {
      setDisplay(d)
      setWaiting(false)
    } else {
      setDisplay(display === '0' ? d : display + d)
    }
  }

  const inputDecimal = () => {
    if (waiting) {
      setDisplay('0.')
      setWaiting(false)
    } else if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const clear = () => {
    setDisplay('0')
    setPrev(null)
    setOp(null)
    setWaiting(false)
  }

  const performOp = (nextOp: string) => {
    const current = parseFloat(display)
    if (prev === null) {
      setPrev(current)
    } else if (op) {
      const result = calculate(prev, current, op)
      setDisplay(String(result))
      setPrev(result)
    }
    setOp(nextOp)
    setWaiting(true)
  }

  const equals = () => {
    if (prev !== null && op) {
      const current = parseFloat(display)
      const result = calculate(prev, current, op)
      setDisplay(String(result))
      setPrev(null)
      setOp(null)
      setWaiting(true)
    }
  }

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '×': return a * b
      case '÷': return b === 0 ? NaN : a / b
      default: return b
    }
  }

  const toggleSign = () => {
    setDisplay(String(parseFloat(display) * -1))
  }

  const percent = () => {
    setDisplay(String(parseFloat(display) / 100))
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key
      if (k >= '0' && k <= '9') inputDigit(k)
      else if (k === '.') inputDecimal()
      else if (k === '+') performOp('+')
      else if (k === '-') performOp('-')
      else if (k === '*') performOp('×')
      else if (k === '/') { e.preventDefault(); performOp('÷') }
      else if (k === 'Enter' || k === '=') equals()
      else if (k === 'Escape') clear()
      else if (k === '%') percent()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [display, prev, op, waiting])

  return (
    <div className="flex flex-col h-full text-rui" style={{ background: '#1C1C1E' }}>
      {/* Display */}
      <div className="flex-1 flex items-end justify-end p-6 pb-4">
        <div
          className="font-display text-right text-rui"
          style={{
            color: '#FFFFFF',
            fontSize: display.length > 9 ? '2.5rem' : '3.5rem',
            fontWeight: 300,
            lineHeight: 1,
          }}
        >
          {display}
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-2 p-3">
        <CalcBtn onClick={clear} variant="fn">AC</CalcBtn>
        <CalcBtn onClick={toggleSign} variant="fn">±</CalcBtn>
        <CalcBtn onClick={percent} variant="fn">%</CalcBtn>
        <CalcBtn onClick={() => performOp('÷')} variant="op" active={op === '÷'}>÷</CalcBtn>

        <CalcBtn onClick={() => inputDigit('7')}>7</CalcBtn>
        <CalcBtn onClick={() => inputDigit('8')}>8</CalcBtn>
        <CalcBtn onClick={() => inputDigit('9')}>9</CalcBtn>
        <CalcBtn onClick={() => performOp('×')} variant="op" active={op === '×'}>×</CalcBtn>

        <CalcBtn onClick={() => inputDigit('4')}>4</CalcBtn>
        <CalcBtn onClick={() => inputDigit('5')}>5</CalcBtn>
        <CalcBtn onClick={() => inputDigit('6')}>6</CalcBtn>
        <CalcBtn onClick={() => performOp('-')} variant="op" active={op === '-'}>−</CalcBtn>

        <CalcBtn onClick={() => inputDigit('1')}>1</CalcBtn>
        <CalcBtn onClick={() => inputDigit('2')}>2</CalcBtn>
        <CalcBtn onClick={() => inputDigit('3')}>3</CalcBtn>
        <CalcBtn onClick={() => performOp('+')} variant="op" active={op === '+'}>+</CalcBtn>

        <CalcBtn onClick={() => inputDigit('0')} className="col-span-2">0</CalcBtn>
        <CalcBtn onClick={inputDecimal}>.</CalcBtn>
        <CalcBtn onClick={equals} variant="op">=</CalcBtn>
      </div>
    </div>
  )
}

function CalcBtn({
  children,
  onClick,
  variant = 'num',
  active = false,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'num' | 'op' | 'fn'
  active?: boolean
  className?: string
}) {
  const styles = {
    num: { background: '#48484A', color: '#FFFFFF' },
    op: { background: active ? '#FFFFFF' : '#FF9500', color: active ? '#FF9500' : '#FFFFFF' },
    fn: { background: '#636366', color: '#FFFFFF' },
  }
  const s = styles[variant]
  return (
    <button
      onClick={onClick}
      className={`h-16 rounded-full font-display text-xl transition-all active:brightness-125 hover:brightness-110 ${className}`}
      style={{ background: s.background, color: s.color, fontWeight: variant === 'op' ? 400 : 300 }}
    >
      {children}
    </button>
  )
}
