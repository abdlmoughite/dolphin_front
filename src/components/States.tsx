export function LoadingGrid() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-80" />)}</div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="card p-8 text-center"><h2 className="font-heading text-xl font-bold">{title}</h2><p className="mt-2 text-slate-600">{text}</p></div>;
}

