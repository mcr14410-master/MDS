import { Pencil } from 'lucide-react';

export default function VacationBalanceCard({ balance, onClick }) {
  const { display_name, total_days, carried_over, remaining_days, taken_days, approved_days, pending_days } = balance;

  const available = parseFloat(total_days) + parseFloat(carried_over || 0);
  const taken = parseFloat(taken_days || 0);
  const approved = parseFloat(approved_days || 0);
  const pending = parseFloat(pending_days || 0);
  const takenPct = available > 0 ? (taken / available) * 100 : 0;
  const approvedPct = available > 0 ? (approved / available) * 100 : 0;
  const pendingPct = available > 0 ? (pending / available) * 100 : 0;

  const getColor = () => {
    if (remaining_days < 0) return 'red';
    if (remaining_days < 5) return 'yellow';
    return 'green';
  };

  const color = getColor();
  const colorClasses = {
    red: {
      border: 'border-red-300 dark:border-red-800',
      text: 'text-red-600 dark:text-red-400',
    },
    yellow: {
      border: 'border-yellow-300 dark:border-yellow-800',
      text: 'text-yellow-600 dark:text-yellow-400',
    },
    green: {
      border: 'border-green-300 dark:border-green-800',
      text: 'text-green-600 dark:text-green-400',
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`px-4 py-3 rounded-lg border ${colorClasses[color].border} bg-white dark:bg-gray-800 
                  cursor-pointer hover:ring-2 hover:ring-green-500 transition-all group`}
    >
      <div className="flex items-center gap-4">
        {/* Left: Name */}
        <div className="w-44 shrink-0 min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate flex items-center gap-1" 
             title={display_name}>
            {display_name}
            <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </p>
        </div>

        {/* Center: Progress bar + Legend */}
        <div className="flex-1 min-w-0">
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {taken > 0 && (
              <div 
                className="h-full bg-gray-500 dark:bg-gray-400 transition-all duration-300"
                style={{ width: `${Math.min(takenPct, 100)}%` }}
                title={`${taken} genommen`}
              />
            )}
            {approved > 0 && (
              <div 
                className="h-full bg-green-500 dark:bg-green-400 transition-all duration-300"
                style={{ width: `${Math.min(approvedPct, 100)}%` }}
                title={`${approved} genehmigt`}
              />
            )}
            {pending > 0 && (
              <div 
                className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-300"
                style={{ width: `${Math.min(pendingPct, 100)}%` }}
                title={`${pending} beantragt`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {taken > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-400 inline-block" />
                {taken} genommen
              </span>
            )}
            {approved > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 inline-block" />
                {approved} genehmigt
              </span>
            )}
            {pending > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 inline-block" />
                {pending} beantragt
              </span>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500 dark:text-gray-400 w-32">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-500">Gesamt</div>
            <div className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {total_days}{carried_over > 0 ? `+${carried_over}` : ''}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-500">Rest</div>
            <div className={`text-lg font-bold ${colorClasses[color].text}`}>
              {remaining_days}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
