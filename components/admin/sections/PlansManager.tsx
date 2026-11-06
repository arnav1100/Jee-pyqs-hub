'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { DEFAULT_PLANS, savePlans, usePlans, type Plan } from '@/lib/plans'

const EMPTY_PLAN: Plan = {
  id: '',
  name: '',
  price: 0,
  durationDays: 30,
  period: '',
  features: [],
  highlight: false,
  active: true,
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Admin → Plans. Everything on the public /premium page (plan names, prices,
 * durations, feature bullets and which card is highlighted) is created here.
 * Saved to the public-read `settings/plans` document so students see changes
 * instantly and no deploy is needed to change pricing.
 */
export default function PlansManager() {
  const { plans, loading } = usePlans()
  const [draft, setDraft] = useState<Plan[]>(plans)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [featuresText, setFeaturesText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(plans)
  }, [plans])

  function openNew() {
    setEditing({ ...EMPTY_PLAN })
    setFeaturesText('')
    setError(null)
  }

  function openEdit(plan: Plan) {
    setEditing({ ...plan })
    setFeaturesText(plan.features.join('\n'))
    setError(null)
  }

  async function persist(next: Plan[]) {
    setSaving(true)
    setError(null)
    try {
      await savePlans(next)
      setDraft(next)
      setSavedAt(Date.now())
    } catch {
      setError('Could not save plans. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePlan() {
    if (!editing) return
    if (!editing.name.trim()) {
      setError('Plan name is required.')
      return
    }
    if (editing.price < 0) {
      setError('Price cannot be negative.')
      return
    }
    const features = featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const plan: Plan = {
      ...editing,
      id: editing.id || slugify(editing.name) || `plan-${Date.now()}`,
      name: editing.name.trim(),
      period: editing.period.trim() || (editing.durationDays > 0 ? `/ ${editing.durationDays} days` : 'one-time'),
      features,
    }
    const exists = draft.some((item) => item.id === plan.id)
    const next = exists ? draft.map((item) => (item.id === plan.id ? plan : item)) : [...draft, plan]
    await persist(next)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this plan? Students will no longer see it on the premium page.')) return
    await persist(draft.filter((plan) => plan.id !== id))
  }

  async function toggleActive(plan: Plan) {
    await persist(draft.map((item) => (item.id === plan.id ? { ...item, active: !item.active } : item)))
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= draft.length) return
    const next = draft.slice()
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    await persist(next)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Subscription plans</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              These plans appear on the student-facing Premium page. Set a duration of <strong>0 days</strong> for a
              lifetime plan. Payment approval automatically extends access by the plan&apos;s duration.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => persist(DEFAULT_PLANS)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              Reset defaults
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white"
            >
              <Plus size={14} /> Add plan
            </button>
          </div>
        </div>

        {savedAt && !saving && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-easy">
            <Check size={13} /> Plans saved
          </p>
        )}
        {error && <p className="mt-3 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-difficult">{error}</p>}
        {loading && <p className="mt-3 text-xs text-slate-400">Loading plans…</p>}

        <div className="mt-4 space-y-2">
          {draft.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No plans yet — add one to start selling.</p>}
          {draft.map((plan, index) => (
            <div key={plan.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">
                  {plan.name}{' '}
                  {plan.highlight && <span className="ml-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">HIGHLIGHT</span>}
                  {!plan.active && <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">HIDDEN</span>}
                </p>
                <p className="text-xs text-slate-500">
                  ₹{plan.price} · {plan.durationDays > 0 ? `${plan.durationDays} days` : 'Lifetime'} · {plan.features.length} features
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(index, -1)} disabled={index === 0} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 disabled:opacity-30">↑</button>
                <button onClick={() => move(index, 1)} disabled={index === draft.length - 1} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 disabled:opacity-30">↓</button>
                <button onClick={() => toggleActive(plan)} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
                  {plan.active ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => openEdit(plan)} className="rounded-md border border-slate-200 p-1.5 text-slate-500"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(plan.id)} className="rounded-md border border-rose-200 p-1.5 text-rose-600"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-ink-900">{draft.some((p) => p.id === editing.id) ? 'Edit plan' : 'New plan'}</h3>
              <button onClick={() => setEditing(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <Field label="Plan name">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. 3-Month Crash Course" className="admin-input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price (₹)">
                  <input type="number" min={0} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className="admin-input" />
                </Field>
                <Field label="Duration (days, 0 = lifetime)">
                  <input type="number" min={0} value={editing.durationDays} onChange={(e) => setEditing({ ...editing, durationDays: Math.max(0, Number(e.target.value)) })} className="admin-input" />
                </Field>
              </div>
              <Field label="Price suffix (optional)">
                <input value={editing.period} onChange={(e) => setEditing({ ...editing, period: e.target.value })} placeholder="/ 30 days" className="admin-input" />
              </Field>
              <Field label="Features (one per line)">
                <textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={4} className="admin-input" placeholder={'Full access to all chapters\nPractice + timed tests'} />
              </Field>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={editing.highlight} onChange={(e) => setEditing({ ...editing, highlight: e.target.checked })} /> Highlight as best value
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Visible to students
                </label>
              </div>
              {error && <p className="text-xs font-semibold text-difficult">{error}</p>}
              <button onClick={handleSavePlan} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} Save plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  )
}
