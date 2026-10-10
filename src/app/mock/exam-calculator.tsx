"use client";
import styles from "./exam-calculator.module.css";
import { useState } from "react";
import { calculate } from "@/features/exam-engine/domain/calculator";

export function ExamCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [left, setLeft] = useState<number | null>(null);
  const [operator, setOperator] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState('');
  function press(key: string) {
    setError('');
    if (key === 'AC') { setDisplay('0'); setLeft(null); setOperator(''); setReplace(false); return; }
    if (/^[0-9.]$/.test(key)) {
      if (replace) { setDisplay(key === '.' ? '0.' : key); setReplace(false); return; }
      if (key === '.' && display.includes('.')) return;
      setDisplay(display.length >= 14 ? display : display === '0' && key !== '.' ? key : display + key);
      return;
    }
    if (key === '⌫') { setDisplay(display.length > 1 ? display.slice(0, -1) : '0'); return; }
    if (key === '±') { setDisplay(String(-Number(display))); return; }
    if (key === '%') { setDisplay(String(Number(display) / 100)); return; }
    try {
      const value = left !== null && operator && !replace ? calculate(left, Number(display), operator) : Number(display);
      setDisplay(String(value));
      setLeft(key === '=' ? null : value);
      setOperator(key === '=' ? '' : key);
      setReplace(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Calculation failed'); }
  }
  return <div data-calculator className="border-b border-slate-200 bg-white px-5 py-2">
    <button type="button" aria-expanded={open} aria-controls="exam-calculator" onClick={() => setOpen(!open)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800">{open ? 'Close calculator' : 'Calculator'} <span className="font-normal text-slate-500">· All subjects</span></button>
    {open && <section id="exam-calculator" aria-label="Calculator" className={styles.panel} onKeyDown={e => {
      const key = ({'*':'×','/':'÷','-':'−','Enter':'=','Backspace':'⌫','Escape':'AC'} as Record<string,string>)[e.key] || e.key;
      if (/^[0-9.]$/.test(key) || ['+','−','×','÷','=','⌫','AC','%'].includes(key)) { e.preventDefault(); e.stopPropagation(); press(key); }
    }}>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold"><span>Calculator</span><button type="button" className="min-h-11 px-3" onClick={() => setOpen(false)}>Close</button></div>
      <div className="rounded-xl bg-slate-100 p-3 text-right"><p className="h-5 text-xs text-slate-500">{left !== null ? `${left} ${operator}` : 'Basic arithmetic'}</p><output className="block overflow-x-auto text-2xl tabular-nums text-slate-900">{display}</output></div>
      {error && <p role="alert" className="py-2 text-sm text-red-700">{error}</p>}
      <div className={styles.keypad}>{['AC','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','='].map(key => <button type="button" key={key} aria-label={key === '⌫' ? 'Delete digit' : key === '±' ? 'Change sign' : key} onClick={() => press(key)} className={`${styles.key} ${key === '=' ? styles.equals : ['+','−','×','÷'].includes(key) ? styles.operator : ''}`}>{key}</button>)}</div>
      <p className="mt-3 text-xs text-slate-500">Calculates in entry order. % divides by 100.</p>
    </section>}
  </div>;
}
