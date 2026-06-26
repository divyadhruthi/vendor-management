const statusStyles = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  visited: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'in progress': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  assigned: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  scheduled: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  draft: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  inactive: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  overdue: 'bg-red-50 text-red-700 ring-red-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  on_hold: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  high: 'bg-red-50 text-red-700 ring-red-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  low: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  sent: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
};

const fallback = 'bg-slate-100 text-slate-600 ring-slate-500/20';

export default function StatusBadge({ status }) {
  if (!status) return null;
  const key = status.toLowerCase().replace(/-/g, '_').replace(/\s+/g, ' ');
  const style = statusStyles[key] || statusStyles[key.replace(' ', '_')] || fallback;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  );
}
