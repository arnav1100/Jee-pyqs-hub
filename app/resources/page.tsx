'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Clock, Download, ExternalLink, FileText, Link2, Loader2, Lock, Search, Sparkles, UploadCloud } from 'lucide-react'
import MathText from '@/components/MathText'
import ResourceUnlockModal from '@/components/ResourceUnlockModal'
import { useResources, useUnlockedResources, type StudyResource } from '@/lib/resources'

interface RevisionResource {
  subject: string
  chapter: string
  title: string
  formulas: string[]
  tip: string
}

const REVISION_RESOURCES: RevisionResource[] = [
  { subject: 'Physics', chapter: 'Kinematics', title: 'Motion in one dimension', formulas: ['\\(v=u+at\\)', '\\(s=ut+\\frac{1}{2}at^2\\)', '\\(v^2=u^2+2as\\)'], tip: 'Choose a positive direction first. Use the nth-second relation only when acceleration is constant.' },
  { subject: 'Physics', chapter: 'Laws of Motion', title: 'Force and friction', formulas: ['\\(\\sum F=ma\\)', '\\(f_s\\leq \\mu_s N\\)', '\\(f_k=\\mu_k N\\)'], tip: 'Draw a separate free-body diagram for each body before writing equations.' },
  { subject: 'Physics', chapter: 'Circular Motion', title: 'Uniform circular motion', formulas: ['\\(a_c=\\frac{v^2}{r}=\\omega^2r\\)', '\\(v=\\omega r\\)', '\\(T=\\frac{2\\pi}{\\omega}\\)'], tip: 'Centripetal force is the net inward force, not an extra force.' },
  { subject: 'Physics', chapter: 'Electrostatics', title: 'Electric field and potential', formulas: ['\\(E=\\frac{F}{q}\\)', '\\(V=\\frac{1}{4\\pi\\epsilon_0}\\frac{q}{r}\\)', '\\(C=\\frac{Q}{V}\\)'], tip: 'Field is a vector; potential is a scalar. Keep their superposition rules separate.' },
  { subject: 'Chemistry', chapter: 'Mole Concept', title: 'Moles and concentration', formulas: ['\\(n=\\frac{m}{M_m}\\)', '\\(N=nN_A\\)', '\\(M=\\frac{n}{V_{\\mathrm{L}}}\\)'], tip: 'Convert volume to litres before calculating molarity.' },
  { subject: 'Chemistry', chapter: 'Equilibrium', title: 'Acid–base quick relations', formulas: ['\\(\\mathrm{pH}=-\\log_{10}[\\mathrm{H}^+]\\)', '\\(\\mathrm{pH}+\\mathrm{pOH}=14\\)'], tip: 'pH + pOH = 14 holds for water at 25 °C — check the temperature condition.' },
  { subject: 'Mathematics', chapter: 'Quadratic Equations', title: 'Roots and coefficients', formulas: ['\\(x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}\\)', '\\(\\alpha+\\beta=-\\frac{b}{a}\\)', '\\(\\alpha\\beta=\\frac{c}{a}\\)'], tip: 'Check the discriminant before deciding the nature of the roots.' },
  { subject: 'Mathematics', chapter: 'Sequences & Series', title: 'Arithmetic and geometric progressions', formulas: ['\\(a_n=a+(n-1)d\\)', '\\(S_n=\\frac{n}{2}[2a+(n-1)d]\\)', '\\(a_n=ar^{n-1}\\)'], tip: 'Identify the constant difference or common ratio before applying a sum formula.' },
]

const TYPE_META: Record<StudyResource['type'], { label: string; icon: typeof FileText }> = {
  pdf: { label: 'PDF', icon: FileText },
  notes: { label: 'Notes', icon: BookOpenCheck },
  link: { label: 'Link', icon: Link2 },
}

export default function ResourcesPage() {
  const { resources, loading } = useResources()
  const { requests, unlocked } = useUnlockedResources()
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [subject, setSubject] = useState('All')
  const [search, setSearch] = useState('')
  const [unlockTarget, setUnlockTarget] = useState<StudyResource | null>(null)
  const [formulaSearch, setFormulaSearch] = useState('')

  const subjects = useMemo(() => ['All', ...Array.from(new Set(resources.map((resource) => resource.subject).filter(Boolean)))], [resources])

  const visible = useMemo(() => resources.filter((resource) => {
    if (!resource.active) return false
    if (filter === 'free' && resource.access !== 'free') return false
    if (filter === 'paid' && resource.access !== 'paid') return false
    if (subject !== 'All' && resource.subject !== subject) return false
    const haystack = `${resource.title} ${resource.description} ${resource.subject}`.toLowerCase()
    return haystack.includes(search.toLowerCase().trim())
  }), [resources, filter, subject, search])

  const formulas = useMemo(() => REVISION_RESOURCES.filter((item) => `${item.subject} ${item.chapter} ${item.title}`.toLowerCase().includes(formulaSearch.toLowerCase().trim())), [formulaSearch])

  const pendingByResource = new Map(requests.map((request) => [request.resourceId, request]))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 sm:py-11">
      <header className="rounded-3xl bg-gradient-to-br from-[#0f766e] via-[#159a87] to-[#39b98f] p-5 text-white shadow-card sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold"><BookOpenCheck size={14} /> Notes, PDFs & formula sheets</span>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Resources</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-white/90">Free notes turant kholein. Paid PDFs ke liye UPI/QR se payment karke UTR submit karein — verify hote hi file unlock ho jati hai.</p>
      </header>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes, PDFs or subject…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-brand-400" />
          </label>
          <div className="flex gap-2">
            {(['all', 'free', 'paid'] as const).map((value) => (
              <button key={value} onClick={() => setFilter(value)} className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize ${filter === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{value}</button>
            ))}
          </div>
        </div>

        {subjects.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.map((value) => (
              <button key={value} onClick={() => setSubject(value)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${subject === value ? 'border-brand-500 bg-emerald-50 text-brand-800' : 'border-slate-200 text-slate-500'}`}>{value}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-32 items-center justify-center"><Loader2 className="animate-spin text-brand-600" /></div>
        ) : visible.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((resource) => {
              const meta = TYPE_META[resource.type] || TYPE_META.pdf
              const Icon = meta.icon
              const request = pendingByResource.get(resource.id)
              const isUnlocked = resource.access === 'free' || unlocked.has(resource.id)
              const isPending = Boolean(request && request.status === 'pending')

              return (
                <article key={resource.id} className="flex min-h-44 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700"><Icon size={12} /> {meta.label}</span>
                    {resource.access === 'paid'
                      ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">₹{resource.price}</span>
                      : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">Free</span>}
                  </div>
                  <h2 className="mt-3 font-display text-base font-bold text-ink-900">{resource.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{resource.description || resource.subject}</p>
                  <div className="mt-auto pt-3">
                    {isUnlocked ? (
                      <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-3 py-2.5 text-xs font-extrabold text-white hover:bg-brand-800">
                        {resource.type === 'link' ? <><ExternalLink size={14} /> Open link</> : <><Download size={14} /> Open / download</>}
                      </a>
                    ) : isPending ? (
                      <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-amber-900"><Clock size={12} /> Verifying your payment</p>
                        <p className="mt-1 text-[10px] leading-4 text-amber-800">Please wait 5 minutes · UTR {request?.utr}</p>
                      </div>
                    ) : (
                      <button onClick={() => setUnlockTarget(resource)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100"><Lock size={13} /> Unlock for ₹{resource.price}</button>
                    )}
                    {request?.status === 'rejected' && <p className="mt-2 text-[10px] font-semibold text-rose-700">Last request reject hui — UTR check karke dobara bhejein.</p>}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <UploadCloud className="mx-auto text-slate-400" size={26} />
            <p className="mt-2 text-sm font-bold text-ink-900">Abhi koi resource upload nahi hua</p>
            <p className="mt-1 text-xs text-slate-500">Admin panel → <strong>Resources</strong> section se PDF / notes / paid PDF add karein.</p>
            <Link href="/admin" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-700">Open admin <ArrowRight size={13} /></Link>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-brand-700">Quick revision</p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink-900">Formula reminders</h2>
          </div>
          <label className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={formulaSearch} onChange={(event) => setFormulaSearch(event.target.value)} placeholder="Search formula or chapter…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-brand-400 sm:w-64" />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {formulas.map((resource) => (
            <article key={`${resource.subject}-${resource.chapter}`} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{resource.subject}</span><span className="text-[11px] text-slate-500">{resource.chapter}</span></div>
              <h3 className="mt-2 font-display text-sm font-bold text-ink-900">{resource.title}</h3>
              <div className="mt-3 space-y-1.5">{resource.formulas.map((formula) => <div key={formula} className="katex-scroll overflow-x-auto rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-ink-900"><MathText text={formula} /></div>)}</div>
              <p className="mt-3 text-[11px] leading-4 text-slate-500">{resource.tip}</p>
            </article>
          ))}
          {!formulas.length && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 sm:col-span-2 lg:col-span-3">Is search se koi formula match nahi hua.</p>}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400"><Sparkles size={12} /> Concise reminders — official syllabus aur NCERT ke saath padhein.</p>
      </section>

      {unlockTarget && (
        <ResourceUnlockModal
          resource={unlockTarget}
          existingRequest={pendingByResource.get(unlockTarget.id)}
          open
          onClose={() => setUnlockTarget(null)}
        />
      )}
    </div>
  )
}
