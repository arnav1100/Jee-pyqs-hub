'use client'

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

export default function Celebration() {
  return <div className="pointer-events-none fixed inset-x-0 top-14 z-50 mx-auto h-28 max-w-4xl overflow-hidden" aria-hidden="true">{Array.from({ length: 22 }, (_, index) => <span key={index} className="celebration-piece" style={{ left: `${4 + ((index * 37) % 92)}%`, backgroundColor: COLORS[index % COLORS.length], animationDelay: `${(index % 7) * 45}ms`, transform: `rotate(${(index * 29) % 180}deg)` }} />)}</div>
}
