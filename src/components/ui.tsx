import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Search, UploadCloud, X } from 'lucide-react';
import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useMemo } from 'react';
import { Link } from 'react-router-dom';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-sm font-bold uppercase tracking-wide text-ocean">{eyebrow}</p>}
        <h1 className="font-heading text-3xl font-extrabold text-navy md:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean" />
      <input className="input pl-10" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function StatusBadge({ status }: { status?: string | boolean | null }) {
  const value = String(status ?? '');
  const tone = value === 'ACTIVE' || value === 'DELIVERED' || value === 'APPROVED' || value === 'true'
    ? 'bg-success/10 text-success'
    : value === 'PENDING' || value === 'PREPARING'
      ? 'bg-amber-100 text-amber-700'
      : value === 'CANCELLED' || value === 'REJECTED' || value === 'ARCHIVED' || value === 'INACTIVE' || value === 'false'
        ? 'bg-coral/10 text-coral'
        : 'bg-ocean/10 text-ocean';
  return <span className={`badge ${tone}`}>{value || 'N/A'}</span>;
}

export function StatCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string | number; helper?: string }) {
  return (
    <div className="card p-5">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-dolphin bg-ocean/10 text-ocean">{icon}</div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <strong className="mt-1 block text-2xl text-navy">{value}</strong>
      {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

export function LoadingState({ label = 'Chargement' }: { label?: string }) {
  return (
    <div className="card grid place-items-center gap-3 p-10 text-slate-600">
      <Loader2 className="h-8 w-8 animate-spin text-ocean" />
      <span className="font-semibold">{label}</span>
    </div>
  );
}

export function ErrorState({ title = 'Erreur de chargement', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <div className="card grid place-items-center gap-3 p-10 text-center">
      <AlertTriangle className="h-9 w-9 text-coral" />
      <h2 className="font-heading text-xl font-bold text-navy">{title}</h2>
      {onRetry && <button className="btn-secondary" onClick={onRetry}>Reessayer</button>}
    </div>
  );
}

export function Pagination({ count, page, onPage, pageSize = 20 }: { count: number; page: number; onPage: (page: number) => void; pageSize?: number }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-4 w-4" />Precedent</button>
      <span className="rounded-dolphin bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">Page {page} / {totalPages}</span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Suivant<ChevronRight className="h-4 w-4" /></button>
    </nav>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/50 p-4 backdrop-blur-sm">
      <div className="card mx-auto max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold text-navy">{title}</h2>
          <button className="rounded-full p-2 hover:bg-mist" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card grid place-items-center gap-3 p-10 text-center">
      <h2 className="font-heading text-xl font-bold text-navy">{title}</h2>
      <p className="max-w-md text-slate-600">{text}</p>
      {action}
    </div>
  );
}

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label="Fil d'Ariane">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 && <span>/</span>}
          {item.to ? <Link className="font-semibold text-ocean hover:text-navy" to={item.to}>{item.label}</Link> : <span className="font-semibold text-slate-700">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function FormField({ label, error, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="grid gap-1 font-semibold">
      {label}
      <input {...props} className={`input ${className}`} />
      {error && <span className="text-sm font-medium text-coral">{error}</span>}
    </label>
  );
}

export function SelectField({ label, error, children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 font-semibold">
      {label}
      <select {...props} className={`input ${className}`}>{children}</select>
      {error && <span className="text-sm font-medium text-coral">{error}</span>}
    </label>
  );
}

export function ImageUploader({ label = 'Images', files, onChange, accept = 'image/png,image/jpeg,image/webp', multiple = true }: { label?: string; files: FileList | null; onChange: (files: FileList | null) => void; accept?: string; multiple?: boolean }) {
  const previews = useMemo(() => files ? Array.from(files).map((file) => ({ name: file.name, url: URL.createObjectURL(file) })) : [], [files]);
  return (
    <div className="grid gap-3">
      <label className="grid cursor-pointer place-items-center gap-3 rounded-dolphin border border-dashed border-ocean/40 bg-ocean/5 p-6 text-center font-semibold text-ocean">
        <UploadCloud className="h-8 w-8" />
        {label}
        <input className="sr-only" type="file" accept={accept} multiple={multiple} onChange={(event) => onChange(event.target.files)} />
      </label>
      {!!previews.length && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{previews.map((preview) => <img key={preview.url} className="aspect-square rounded-dolphin object-cover ring-1 ring-slate-200" src={preview.url} alt={preview.name} />)}</div>}
    </div>
  );
}

export function ConfirmDialog({ title, description, confirmLabel = 'Confirmer', tone = 'danger', onCancel, onConfirm }: { title: string; description: string; confirmLabel?: string; tone?: 'danger' | 'primary'; onCancel: () => void; onConfirm: () => void | Promise<void> }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4 backdrop-blur-sm">
      <div className="card grid w-full max-w-md gap-4 p-6">
        <h2 className="font-heading text-2xl font-bold text-navy">{title}</h2>
        <p className="text-slate-600">{description}</p>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>Annuler</button>
          <button type="button" className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function DataTable<T extends { id: number | string }>({
  rows,
  columns,
  loading = false,
  error = false,
  emptyTitle = 'Aucune donnee',
  emptyText = 'Aucun resultat ne correspond aux criteres.',
  actions,
  onRetry,
}: {
  rows: T[];
  columns: { key: string; header: string; render?: (row: T) => ReactNode }[];
  loading?: boolean;
  error?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  actions?: (row: T) => ReactNode;
  onRetry?: () => void;
}) {
  if (loading) return <LoadingState label="Chargement des donnees" />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (!rows.length) return <EmptyState title={emptyTitle} text={emptyText} />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-mist">
          <tr>
            {columns.map((column) => <th key={column.key} className="p-3 font-bold text-slate-700">{column.header}</th>)}
            {actions && <th className="p-3 font-bold text-slate-700">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              {columns.map((column) => <td key={column.key} className="p-3 align-top">{column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}</td>)}
              {actions && <td className="p-3 align-top">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
