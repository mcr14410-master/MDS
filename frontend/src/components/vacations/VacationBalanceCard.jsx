import { Pencil } from 'lucide-react';

export default function VacationBalanceCard({ balance, onClick }) {
  const { display_name, total_days, carried_over, used_days, remaining_days, role_name } = balance;

  // Calculate percentage
  const available = parseFloat(total_days) + parseFloat(carried_over || 0);
  const usedPercent = available > 0 ? (parseFloat(used_days) / available) * 100 : 0;

  // Determine color based on remaining days
  const getColor = () => {
    if (remaining_days < 0) return 'red';
    if (remaining_days < 5) return 'yellow';
    return 'green';
  };

  const color = getColor();
  const colorClasses = {
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      bar: 'bg-red-500'
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      bar: 'bg-yellow-500'
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      bar: 'bg-green-500'
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`p-3 rounded-lg ${colorClasses[color].bg} cursor-pointer 
                  hover:ring-2 hover:ring-green-500 transition-all group`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate flex items-center gap-1" 
             title={display_name}>
            {display_name}
            <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          {role_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {role_name}
            </p>
          )}
        </div>
        <div className={`text-lg font-bold ${colorClasses[color].text}`}>
          {remaining_days}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color].bar} transition-all duration-300`}
          style={{ width: `${Math.min(usedPercent, 100)}%` }}
        />
      </div>

      {/* Details */}
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{used_days} genommen</span>
        <span>
          {total_days}
          {carried_over > 0 && ` +${carried_over}`}
          {' '}gesamt
        </span>
      </div>
    </div>
  );
}
