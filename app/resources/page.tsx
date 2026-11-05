'use client'

import { useMemo, useState } from 'react'
import { BookOpenCheck, Search, Sparkles } from 'lucide-react'
import MathText from '@/components/MathText'

interface RevisionResource {
  subject: string
  chapter: string
  title: string
  formulas: string[]
  tip: string
}

const RESOURCES: RevisionResource[] = [
  { subject: 'Physics', chapter: 'Kinematics', title: 'Motion in one dimension', formulas: ['\\(v=u+at\\)', '\\(s=ut+\\frac{1}{2}at^2\\)', '\\(v^2=u^2+2as\\)', '\\(s_n=u+\\frac{a}{2}(2n-1)\\)'], tip: 'Choose a positive direction first. Use the nth-second relation only when acceleration is constant.' },
  { subject: 'Physics', chapter: 'Laws of Motion', title: 'Force and friction', formulas: ['\\(\\sum F=ma\\)', '\\(f_s\\leq \\mu_s N\\)', '\\(f_k=\\mu_k N\\)', '\\(F_{spring}=-kx\\)'], tip: 'Draw a separate free-body diagram for each body before writing equations.' },
  { subject: 'Physics', chapter: 'Work, Energy & Power', title: 'Energy methods', formulas: ['\\(W_{net}=\\Delta K\\)', '\\(K=\\frac{1}{2}mv^2\\)', '\\(U_{spring}=\\frac{1}{2}kx^2\\)', '\\(P=\\frac{dW}{dt}=\\vec{F}\\cdot\\vec{v}\\)'], tip: 'If force varies with position, work is the area under the force–displacement graph.' },
  { subject: 'Physics', chapter: 'Circular Motion', title: 'Uniform circular motion', formulas: ['\\(a_c=\\frac{v^2}{r}=\\omega^2r\\)', '\\(v=\\omega r\\)', '\\(F_c=\\frac{mv^2}{r}\\)', '\\(T=\\frac{2\\pi}{\\omega}\\)'], tip: 'Centripetal force is the net inward force, not an additional force to add to the diagram.' },
  { subject: 'Physics', chapter: 'Electrostatics', title: 'Electric field and potential', formulas: ['\\(F=\\frac{1}{4\\pi\\epsilon_0}\\frac{q_1q_2}{r^2}\\)', '\\(E=\\frac{F}{q}\\)', '\\(V=\\frac{1}{4\\pi\\epsilon_0}\\frac{q}{r}\\)', '\\(C=\\frac{Q}{V}\\)'], tip: 'Electric field is a vector; potential is a scalar. Keep their superposition rules separate.' },
  { subject: 'Chemistry', chapter: 'Mole Concept', title: 'Moles and concentration', formulas: ['\\(n=\\frac{m}{M_m}\\)', '\\(N=nN_A\\)', '\\(M=\\frac{n}{V_{\\mathrm{L}}}\\)', '\\(\\text{mole fraction }x_i=\\frac{n_i}{\\sum n_i}\\)'], tip: 'Convert volume to litres before calculating molarity, and keep significant units through each step.' },
  { subject: 'Chemistry', chapter: 'Gaseous State', title: 'Ideal gas relations', formulas: ['\\(PV=nRT\\)', '\\(P_1V_1=P_2V_2\\quad(T,n\\text{ constant})\\)', '\\(u_{rms}=\\sqrt{\\frac{3RT}{M}}\\)', '\\(d=\\frac{PM}{RT}\\)'], tip: 'Use kelvin for temperature and consistent pressure/volume units in gas equations.' },
  { subject: 'Chemistry', chapter: 'Equilibrium', title: 'Acid–base quick relations', formulas: ['\\(\\mathrm{pH}=-\\log_{10}[\\mathrm{H}^+]\\)', '\\(\\mathrm{pOH}=-\\log_{10}[\\mathrm{OH}^-]\\)', '\\(\\mathrm{pH}+\\mathrm{pOH}=14\\quad(25^\\circ\\mathrm{C})\\)', '\\(K_w=[\\mathrm{H}^+][\\mathrm{OH}^-]\\)'], tip: 'The pH + pOH = 14 relation applies to water at 25 °C; check the temperature condition.' },
  { subject: 'Mathematics', chapter: 'Quadratic Equations', title: 'Roots and coefficients', formulas: ['\\(ax^2+bx+c=0\\)', '\\(x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}\\)', '\\(\\alpha+\\beta=-\\frac{b}{a}\\)', '\\(\\alpha\\beta=\\frac{c}{a}\\)'], tip: 'Check the discriminant before deciding whether roots are real, equal, or complex.' },
  { subject: 'Mathematics', chapter: 'Sequences & Series', title: 'Arithmetic and geometric progressions', formulas: ['\\(a_n=a+(n-1)d\\)', '\\(S_n=\\frac{n}{2}[2a+(n-1)d]\\)', '\\(a_n=ar^{n-1}\\)', '\\(S_n=a\\frac{1-r^n}{1-r}\\quad(r\\ne1)\\)'], tip: 'Identify the constant difference or common ratio from consecutive terms before applying a sum formula.' },
  { subject: 'Mathematics', chapter: 'Differentiation', title: 'Core derivative rules', formulas: ['\\(\\frac{d}{dx}x^n=nx^{n-1}\\)', '\\(\\frac{d}{dx}\\sin x=\\cos x\\)', '\\(\\frac{d}{dx}e^x=e^x\\)', '\\(\\frac{d}{dx}\\ln x=\\frac{1}{x}\\)'], tip: 'Use the chain rule for a function inside another function, and state the domain when using logarithms.' },
]

export default function ResourcesPage() {
  const [subject, setSubject] = useState('All')
  const [search, setSearch] = useState('')
  const resources = useMemo(() => RESOURCES.filter((resource) => (subject === 'All' || resource.subject === subject) && `${resource.subject} ${resource.chapter} ${resource.title} ${resource.tip}`.toLowerCase().includes(search.toLowerCase().trim())), [subject, search])
  const subjects = ['All', ...Array.from(new Set(RESOURCES.map((resource) => resource.subject)))]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:py-11">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><BookOpenCheck size={14} /> Quick revision</span><h1 className="mt-3 font-display text-3xl font-bold text-ink-900">Study resources</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Search concise formula reminders and revision prompts by subject or chapter. Use your class notes and official material for full topic coverage.</p></div><div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"><Sparkles size={14} />Short notes for quick recall</div></div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search formula, topic or chapter…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-brand-400" /></label><div className="flex gap-2">{subjects.map((value) => <button key={value} onClick={() => setSubject(value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${subject === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{value}</button>)}</div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <article key={`${resource.subject}/${resource.chapter}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{resource.subject}</span><span className="text-xs text-slate-500">{resource.chapter}</span></div><h2 className="mt-3 font-display text-lg font-bold text-ink-900">{resource.title}</h2><div className="mt-4 space-y-2">{resource.formulas.map((formula) => <div key={formula} className="katex-scroll overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-900"><MathText text={formula} /></div>)}</div><div className="mt-4 rounded-xl border-l-2 border-amber-400 bg-amber-50/70 p-3"><p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Revision tip</p><p className="mt-1 text-xs leading-5 text-amber-950">{resource.tip}</p></div></article>)}{!resources.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">No resources match that search.</div>}</div>
      <p className="mt-5 text-xs leading-5 text-slate-400">These are concise reference reminders, not a complete replacement for the official syllabus, NCERT texts, or your teacher&apos;s materials. Formula conditions are noted where relevant.</p>
    </div>
  )
}
