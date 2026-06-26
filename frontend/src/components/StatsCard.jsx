export default function StatsCard({ icon: Icon, title, value, change, changeType = 'neutral', color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  const changeColors = {
    up: 'text-emerald-600',
    down: 'text-red-500',
    neutral: 'text-slate-500',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
          {change !== undefined && (
            <p className={`mt-1 text-xs font-medium ${changeColors[changeType]}`}>
              {changeType === 'up' && '↑ '}
              {changeType === 'down' && '↓ '}
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`rounded-lg p-2.5 ${colorMap[color] || colorMap.primary}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
