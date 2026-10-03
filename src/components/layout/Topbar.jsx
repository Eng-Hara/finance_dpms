import { Menu } from 'lucide-react'

export default function Topbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button onClick={onMenuClick} className="lg:hidden">
        <Menu className="w-5 h-5 text-slate-600" />
      </button>
      <div className="flex-1" />
      <div className="text-sm text-slate-500">
        {new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </div>
    </header>
  )
}