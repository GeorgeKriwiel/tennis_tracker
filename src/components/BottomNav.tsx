export type Page = 'league' | 'courts'

const ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'league', label: 'League', icon: '🏆' },
  { page: 'courts', label: 'Courts', icon: '📍' },
]

export function BottomNav({
  page,
  onChange,
}: {
  page: Page
  onChange: (page: Page) => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid grid-cols-2">
        {ITEMS.map((item) => (
          <button
            key={item.page}
            onClick={() => onChange(item.page)}
            aria-current={page === item.page ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
              page === item.page
                ? 'text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-400'
            }`}
          >
            <span className={`text-xl ${page === item.page ? '' : 'opacity-50'}`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
