import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/**
 * Format name as "T. Meyer" instead of "Thomas Meyer"
 */
function formatShortName(displayName) {
  const parts = displayName?.trim().split(' ') || [];
  if (parts.length >= 2) {
    return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
  }
  return displayName;
}

/**
 * Check for role-based overlaps on a specific day
 * Uses roleLimits from DB (role_id -> max_concurrent)
 * Now supports vacations with multiple roles
 */
function checkDayOverlaps(dayVacations, roleLimits) {
  if (!roleLimits || roleLimits.length === 0) return [];
  
  // Create lookup: role_id -> { max_concurrent, role_name }
  const limitsByRoleId = {};
  roleLimits.forEach(rl => {
    limitsByRoleId[rl.role_id] = {
      max: rl.max_concurrent,
      name: rl.role_name
    };
  });
  
  // Group vacations by role_id (a vacation can belong to multiple roles)
  const byRoleId = {};
  dayVacations.forEach(v => {
    // v.roles is an array of { role_id, role_name }
    const roles = Array.isArray(v.roles) ? v.roles : [];
    roles.forEach(role => {
      const roleId = role.role_id;
      if (roleId && limitsByRoleId[roleId]) {
        if (!byRoleId[roleId]) byRoleId[roleId] = [];
        // Avoid counting same vacation twice for same role
        if (!byRoleId[roleId].find(existing => existing.id === v.id)) {
          byRoleId[roleId].push({ ...v, role_name: role.role_name });
        }
      }
    });
  });
  
  const overlaps = [];
  
  // Check each role that has a limit
  Object.entries(byRoleId).forEach(([roleId, vacations]) => {
    const limit = limitsByRoleId[roleId];
    if (vacations.length > limit.max) {
      overlaps.push({
        role: limit.name,
        count: vacations.length,
        max: limit.max,
        people: vacations
      });
    }
  });
  
  return overlaps;
}

/**
 * Get all days in a month
 */
function getDaysInMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  
  // Get day of week (0 = Sunday, convert to Monday = 0)
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;
  
  const days = [];
  
  // Add empty days for padding
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month - 1, d));
  }
  
  return days;
}

/**
 * Format date as YYYY-MM-DD (local timezone, not UTC!)
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if date is today
 */
function isToday(date) {
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Check if date is weekend
 */
function isWeekend(date) {
  if (!date) return false;
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Group vacations by user for display
 */
function groupVacationsByUser(vacations) {
  const grouped = {};
  vacations.forEach(v => {
    if (!grouped[v.user_id]) {
      grouped[v.user_id] = {
        user_id: v.user_id,
        display_name: v.display_name,
        vacations: []
      };
    }
    grouped[v.user_id].vacations.push(v);
  });
  return Object.values(grouped).sort((a, b) => 
    a.display_name.localeCompare(b.display_name)
  );
}

// ============================================
// MONTH VIEW
// ============================================

// Stil eines Eintrags (genehmigt: farbig, beantragt: gestrichelt/schraffiert)
function vacationEntryStyle(v) {
  const isPending = v.status === 'pending';
  return {
    backgroundColor: isPending ? 'transparent' : v.type_color + '30',
    color: v.type_color,
    borderLeft: `3px ${isPending ? 'dashed' : 'solid'} ${v.type_color}`,
    ...(isPending ? {
      backgroundImage: `repeating-linear-gradient(
        -45deg,
        ${v.type_color}15,
        ${v.type_color}15 3px,
        ${v.type_color}35 3px,
        ${v.type_color}35 6px
      )`
    } : {})
  };
}

// Tooltip eines Eintrags: Name, Art und Zeitraum
function vacationTooltip(v) {
  const isPending = v.status === 'pending';
  return `${v.display_name}${isPending ? ' (beantragt)' : ''}\n${v.type_name}: ${new Date(v.start_date).toLocaleDateString('de-DE')} - ${new Date(v.end_date).toLocaleDateString('de-DE')}`;
}

// Zeitraum kurz, z. B. „14.10.–18.10.“ bzw. „14.10.“ bei einem Tag
function formatShortRange(v) {
  const fmt = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return formatDate(v.start_date) === formatDate(v.end_date)
    ? fmt(v.start_date)
    : `${fmt(v.start_date)}–${fmt(v.end_date)}`;
}

// Alle Abwesenheiten eines Tages (aus „+N mehr“) – Klick auf einen Eintrag öffnet ihn wie im Kalender
function DayListModal({ dateStr, vacations, onVacationClick, onClose }) {
  const title = new Date(`${dateStr}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Abwesenheiten am ${title}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Abwesenheiten</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title} · {vacations.length}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="p-3 space-y-1 overflow-y-auto">
          {vacations.map(v => {
            // Ohne Verwaltungsrecht kein Button – deaktivierte Buttons zeigen keinen Tooltip
            const Entry = onVacationClick ? 'button' : 'div';
            return (
              <li key={v.id}>
                <Entry
                  {...(onVacationClick ? { type: 'button', onClick: () => { onClose(); onVacationClick(v); } } : {})}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded ${onVacationClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                  style={vacationEntryStyle(v)}
                  title={vacationTooltip(v)}
                >
                  <span className="font-medium">{v.display_name}</span>
                  <span className="opacity-80"> · {v.type_name}{v.status === 'pending' ? ' (beantragt)' : ''} · <span className="whitespace-nowrap">{formatShortRange(v)}</span></span>
                </Entry>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function MonthView({ data, year, month, vacationTypes, roleLimits, onVacationClick, onDayClick }) {
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const [listDate, setListDate] = useState(null);
  
  const { vacations = [], holidays = [] } = data;
  
  // Create lookup maps
  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      map[formatDate(h.date)] = h;
    });
    return map;
  }, [holidays]);

  // Get vacations for a specific date
  const getVacationsForDate = (date) => {
    if (!date) return [];
    const dateStr = formatDate(date);
    return vacations.filter(v => {
      const start = formatDate(v.start_date);
      const end = formatDate(v.end_date);
      return dateStr >= start && dateStr <= end;
    });
  };

  // Group vacations by user
  const userGroups = useMemo(() => groupVacationsByUser(vacations), [vacations]);

  return (
    <div className="p-4">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div 
            key={day} 
            className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-24" />;
          }

          const dateStr = formatDate(date);
          const holiday = holidayMap[dateStr];
          const dayVacations = getVacationsForDate(date);
          const weekend = isWeekend(date);
          const today = isToday(date);
          
          // Check for overlaps
          const overlaps = checkDayOverlaps(dayVacations, roleLimits);
          const hasOverlap = overlaps.length > 0;

          return (
            <div
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={`h-24 border rounded-lg p-1 transition-colors relative overflow-hidden
                ${onDayClick ? 'cursor-pointer' : ''}
                ${weekend ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'}
                ${holiday ? 'bg-red-50 dark:bg-red-900/20' : ''}
                ${today ? 'ring-2 ring-green-500' : ''}
                ${hasOverlap ? 'border-orange-400 dark:border-orange-500' : 'border-gray-200 dark:border-gray-700'}
                hover:bg-gray-100 dark:hover:bg-gray-700
              `}
            >
              {/* Overlap Warning Indicator */}
              {hasOverlap && (
                <div 
                  className="absolute top-0 right-0 w-0 h-0 
                             border-t-[12px] border-t-orange-500 
                             border-l-[12px] border-l-transparent
                             cursor-help"
                  title={overlaps.map(o => 
                    `⚠️ ${o.count}/${o.max} ${o.role}: ${o.people.map(p => formatShortName(p.display_name)).join(', ')}`
                  ).join('\n')}
                />
              )}

              {/* Day Number */}
              <div className={`text-sm font-medium mb-1 flex items-center gap-1
                ${weekend ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}
                ${holiday ? 'text-red-600 dark:text-red-400' : ''}
                ${today ? 'text-green-600 dark:text-green-400' : ''}
              `}>
                {date.getDate()}
              </div>

              {/* Holiday Name */}
              {holiday && (
                <div className="text-xs text-red-600 dark:text-red-400 truncate mb-1">
                  {holiday.name}
                </div>
              )}

              {/* Vacations – Zelle hat feste Höhe: 3 Einträge, an Feiertagen 2; bei mehr einer weniger + „+N mehr“ */}
              {(() => {
                const capacity = holiday ? 2 : 3;
                const visible = dayVacations.length > capacity ? capacity - 1 : capacity;
                return (
                  <div className="space-y-0.5">
                    {dayVacations.slice(0, visible).map(v => {
                      const isPending = v.status === 'pending';
                      return (
                      <div
                        key={v.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onVacationClick?.(v);
                        }}
                        className={`text-xs px-1 py-0.5 rounded truncate transition-opacity
                                   ${onVacationClick ? 'cursor-pointer hover:opacity-80' : ''}`}
                        style={vacationEntryStyle(v)}
                        title={vacationTooltip(v)}
                      >
                        {formatShortName(v.display_name)}{isPending ? ' ?' : ''}
                      </div>
                      );
                    })}
                    {dayVacations.length > visible && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setListDate(dateStr);
                        }}
                        className="block text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        title={dayVacations.slice(visible).map(vacationTooltip).join('\n\n')}
                      >
                        +{dayVacations.length - visible} mehr
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {listDate && (
        <DayListModal
          dateStr={listDate}
          vacations={vacations.filter(v => listDate >= formatDate(v.start_date) && listDate <= formatDate(v.end_date))}
          onVacationClick={onVacationClick}
          onClose={() => setListDate(null)}
        />
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
        {vacationTypes.filter(t => t.is_active).map(type => (
          <div key={type.id} className="flex items-center gap-2 text-sm">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: type.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{type.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <div 
            className="w-4 h-4 rounded border border-dashed border-gray-400 dark:border-gray-500"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                rgba(156,163,175,0.15),
                rgba(156,163,175,0.15) 2px,
                rgba(156,163,175,0.4) 2px,
                rgba(156,163,175,0.4) 4px
              )`
            }}
          />
          <span className="text-gray-600 dark:text-gray-400">Beantragt</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// YEAR VIEW (Gantt-style)
// ============================================

function YearView({ data, year, vacationTypes, onVacationClick, onDayClick }) {
  const { vacations = [], holidays = [] } = data;
  
  // Group vacations by user
  const userGroups = useMemo(() => groupVacationsByUser(vacations), [vacations]);
  
  // Create holiday lookup
  const holidayDates = useMemo(() => {
    const set = new Set();
    holidays.forEach(h => set.add(formatDate(h.date)));
    return set;
  }, [holidays]);

  // Get position and width for a vacation bar
  const getBarStyle = (vacation) => {
    const startDate = new Date(vacation.start_date);
    const endDate = new Date(vacation.end_date);
    
    // Calculate day of year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const totalDays = Math.ceil((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;
    
    // Clamp to year
    const clampedStart = startDate < yearStart ? yearStart : startDate;
    const clampedEnd = endDate > yearEnd ? yearEnd : endDate;
    
    const startDay = Math.ceil((clampedStart - yearStart) / (1000 * 60 * 60 * 24));
    const endDay = Math.ceil((clampedEnd - yearStart) / (1000 * 60 * 60 * 24));
    
    const left = (startDay / totalDays) * 100;
    const width = ((endDay - startDay + 1) / totalDays) * 100;
    
    return {
      left: `${left}%`,
      width: `${Math.max(width, 0.5)}%`
    };
  };

  return (
    <div className="p-4">
      {/* Month Headers */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2">
        <div className="w-40 shrink-0" /> {/* Name column */}
        <div className="flex-1 grid grid-cols-12">
          {MONTHS_SHORT.map((m, idx) => (
            <div 
              key={m} 
              className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2 
                         border-l border-gray-200 dark:border-gray-700"
            >
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* User Rows */}
      <div className="space-y-1">
        {userGroups.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Keine Abwesenheiten für {year}
          </div>
        ) : (
          userGroups.map(group => (
            <div 
              key={group.user_id}
              className="flex items-center h-8 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
            >
              {/* User Name */}
              <div className="w-40 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300 
                              truncate px-2">
                {formatShortName(group.display_name)}
              </div>
              
              {/* Timeline */}
              <div className="flex-1 relative h-6 bg-gray-100 dark:bg-gray-900 rounded">
                {/* Month grid lines */}
                <div className="absolute inset-0 grid grid-cols-12">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div 
                      key={idx}
                      className="border-l border-gray-200 dark:border-gray-700"
                    />
                  ))}
                </div>
                
                {/* Vacation bars */}
                {group.vacations.map(v => {
                  const style = getBarStyle(v);
                  const isPending = v.status === 'pending';
                  return (
                    <div
                      key={v.id}
                      onClick={() => onVacationClick?.(v)}
                      className="absolute top-1 h-4 rounded cursor-pointer hover:opacity-80 
                                 transition-opacity shadow-sm"
                      style={{
                        left: style.left,
                        width: style.width,
                        backgroundColor: isPending ? 'transparent' : v.type_color,
                        minWidth: '4px',
                        ...(isPending ? {
                          backgroundImage: `repeating-linear-gradient(
                            -45deg,
                            ${v.type_color}40,
                            ${v.type_color}40 3px,
                            ${v.type_color} 3px,
                            ${v.type_color} 6px
                          )`,
                          border: `1px dashed ${v.type_color}`
                        } : {})
                      }}
                      title={`${v.type_name}${isPending ? ' (beantragt)' : ''}: ${new Date(v.start_date).toLocaleDateString('de-DE')} - ${new Date(v.end_date).toLocaleDateString('de-DE')}`}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
        {vacationTypes.filter(t => t.is_active).map(type => (
          <div key={type.id} className="flex items-center gap-2 text-sm">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: type.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{type.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <div 
            className="w-4 h-4 rounded border border-dashed border-gray-400 dark:border-gray-500"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                rgba(156,163,175,0.15),
                rgba(156,163,175,0.15) 2px,
                rgba(156,163,175,0.4) 2px,
                rgba(156,163,175,0.4) 4px
              )`
            }}
          />
          <span className="text-gray-600 dark:text-gray-400">Beantragt</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function VacationCalendar({ 
  data, 
  view, 
  year, 
  month,
  vacationTypes,
  roleLimits,
  onVacationClick,
  onDayClick 
}) {
  if (view === 'year') {
    return (
      <YearView
        data={data}
        year={year}
        vacationTypes={vacationTypes}
        onVacationClick={onVacationClick}
        onDayClick={onDayClick}
      />
    );
  }

  return (
    <MonthView
      data={data}
      year={year}
      month={month}
      vacationTypes={vacationTypes}
      roleLimits={roleLimits}
      onVacationClick={onVacationClick}
      onDayClick={onDayClick}
    />
  );
}
