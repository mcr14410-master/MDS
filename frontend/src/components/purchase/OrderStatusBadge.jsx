import { 
  FileText, 
  Send, 
  CheckCircle2, 
  Package, 
  PackageCheck,
  XCircle 
} from 'lucide-react';

/**
 * OrderStatusBadge Component
 * Displays purchase order status with appropriate color and icon
 * 
 * Status values:
 * - draft: Entwurf
 * - sent: Versendet
 * - confirmed: Bestätigt
 * - partially_received: Teilweise erhalten
 * - received: Erhalten
 * - cancelled: Storniert
 */
export default function OrderStatusBadge({ status, size = 'md', showIcon = true }) {
  const statusConfig = {
    draft: {
      label: 'Entwurf',
      icon: FileText,
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      darkColor: 'dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-600/40',
    },
    sent: {
      label: 'Versendet',
      icon: Send,
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      darkColor: 'dark:bg-blue-700/30 dark:text-blue-300 dark:border-blue-600/40',
    },
    confirmed: {
      label: 'Bestätigt',
      icon: CheckCircle2,
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      darkColor: 'dark:bg-cyan-700/30 dark:text-cyan-300 dark:border-cyan-600/40',
    },
    partially_received: {
      label: 'Teilweise erhalten',
      icon: Package,
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      darkColor: 'dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600/40',
    },
    received: {
      label: 'Erhalten',
      icon: PackageCheck,
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      darkColor: 'dark:bg-green-700/30 dark:text-green-300 dark:border-green-600/40',
    },
    cancelled: {
      label: 'Storniert',
      icon: XCircle,
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      darkColor: 'dark:bg-red-700/30 dark:text-red-300 dark:border-red-600/40',
    },
  };

  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-md border font-medium
        ${config.color} ${config.darkColor}
        ${sizeClasses[size]}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
