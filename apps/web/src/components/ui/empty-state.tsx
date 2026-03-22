'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  illustration: 'friends' | 'messages' | 'steps' | 'segments' | 'templates' | 'forms' | 'coupons' | 'reservations' | 'analytics' | 'rich-menus' | 'generic';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
  children?: ReactNode;
}

// SVG illustrations - LINE green themed, friendly style
function Illustration({ type, className }: { type: EmptyStateProps['illustration']; className?: string }) {
  const base = cn('mx-auto', className);

  switch (type) {
    case 'friends':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* People silhouettes */}
          <circle cx="60" cy="42" r="16" fill="#06C755" opacity="0.15" />
          <circle cx="60" cy="42" r="10" fill="#06C755" opacity="0.25" />
          <path d="M44 72c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke="#06C755" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          <circle cx="100" cy="46" r="13" fill="#06C755" opacity="0.1" />
          <circle cx="100" cy="46" r="8" fill="#06C755" opacity="0.2" />
          <path d="M87 72c0-7.18 5.82-13 13-13s13 5.82 13 13" stroke="#06C755" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
          {/* Plus icon */}
          <circle cx="130" cy="36" r="10" fill="#06C755" opacity="0.12" />
          <path d="M126 36h8M130 32v8" stroke="#06C755" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          {/* Dots decoration */}
          <circle cx="30" cy="60" r="2" fill="#06C755" opacity="0.15" />
          <circle cx="24" cy="48" r="1.5" fill="#06C755" opacity="0.1" />
        </svg>
      );

    case 'messages':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Chat bubbles */}
          <rect x="30" y="24" width="60" height="32" rx="12" fill="#06C755" opacity="0.12" />
          <rect x="30" y="24" width="60" height="32" rx="12" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
          <circle cx="50" cy="40" r="2.5" fill="#06C755" opacity="0.3" />
          <circle cx="60" cy="40" r="2.5" fill="#06C755" opacity="0.3" />
          <circle cx="70" cy="40" r="2.5" fill="#06C755" opacity="0.3" />
          {/* Reply bubble */}
          <rect x="70" y="64" width="56" height="28" rx="10" fill="#06C755" opacity="0.08" />
          <rect x="70" y="64" width="56" height="28" rx="10" stroke="#06C755" strokeWidth="1.5" opacity="0.15" />
          <rect x="82" y="74" width="30" height="3" rx="1.5" fill="#06C755" opacity="0.15" />
          <rect x="82" y="81" width="20" height="3" rx="1.5" fill="#06C755" opacity="0.1" />
          {/* Arrow */}
          <path d="M55 56l5 8" stroke="#06C755" strokeWidth="1" strokeLinecap="round" opacity="0.15" />
        </svg>
      );

    case 'steps':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Flow nodes */}
          <rect x="55" y="14" width="50" height="22" rx="6" fill="#06C755" fillOpacity="0.15" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.25" />
          <rect x="62" y="22" width="28" height="3" rx="1.5" fill="#06C755" opacity="0.2" />
          <line x1="80" y1="36" x2="80" y2="48" stroke="#06C755" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.2" />
          <rect x="45" y="48" width="34" height="20" rx="6" fill="#06C755" fillOpacity="0.1" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.18" />
          <rect x="81" y="48" width="34" height="20" rx="6" fill="#06C755" fillOpacity="0.1" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.18" />
          <line x1="62" y1="68" x2="62" y2="80" stroke="#06C755" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.15" />
          <line x1="98" y1="68" x2="98" y2="80" stroke="#06C755" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.15" />
          <rect x="45" y="80" width="70" height="20" rx="6" fill="#06C755" fillOpacity="0.08" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.12" />
          {/* Branch arrow */}
          <path d="M80 36l-18 12M80 36l18 12" stroke="#06C755" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
        </svg>
      );

    case 'segments':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Venn diagram style */}
          <circle cx="65" cy="55" r="28" fill="#06C755" fillOpacity="0.08" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.2" />
          <circle cx="95" cy="55" r="28" fill="#06C755" fillOpacity="0.08" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.2" />
          {/* Intersection highlight */}
          <ellipse cx="80" cy="55" rx="12" ry="20" fill="#06C755" opacity="0.12" />
          {/* Small dots representing people */}
          <circle cx="55" cy="50" r="2" fill="#06C755" opacity="0.25" />
          <circle cx="60" cy="60" r="2" fill="#06C755" opacity="0.25" />
          <circle cx="80" cy="48" r="2" fill="#06C755" opacity="0.35" />
          <circle cx="80" cy="62" r="2" fill="#06C755" opacity="0.35" />
          <circle cx="100" cy="50" r="2" fill="#06C755" opacity="0.25" />
          <circle cx="105" cy="60" r="2" fill="#06C755" opacity="0.25" />
        </svg>
      );

    case 'templates':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Stacked cards */}
          <rect x="48" y="28" width="64" height="72" rx="8" fill="#06C755" fillOpacity="0.06" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.12" />
          <rect x="42" y="22" width="64" height="72" rx="8" fill="#06C755" fillOpacity="0.09" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.18" />
          <rect x="36" y="16" width="64" height="72" rx="8" fill="white" stroke="#06C755" strokeWidth="1.5" opacity="0.3" />
          {/* Card content lines */}
          <rect x="46" y="28" width="36" height="4" rx="2" fill="#06C755" opacity="0.2" />
          <rect x="46" y="38" width="44" height="3" rx="1.5" fill="#06C755" opacity="0.12" />
          <rect x="46" y="46" width="40" height="3" rx="1.5" fill="#06C755" opacity="0.08" />
          <rect x="46" y="54" width="32" height="3" rx="1.5" fill="#06C755" opacity="0.08" />
          {/* Magic sparkle */}
          <path d="M108 32l2-6 2 6 6 2-6 2-2 6-2-6-6-2z" fill="#06C755" opacity="0.2" />
        </svg>
      );

    case 'forms':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Form card */}
          <rect x="40" y="16" width="80" height="88" rx="8" fill="white" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
          {/* Form fields */}
          <rect x="52" y="30" width="24" height="3" rx="1.5" fill="#06C755" opacity="0.2" />
          <rect x="52" y="38" width="56" height="10" rx="4" fill="#06C755" fillOpacity="0.06" stroke="#06C755" strokeWidth="1" strokeOpacity="0.15" />
          <rect x="52" y="56" width="24" height="3" rx="1.5" fill="#06C755" opacity="0.2" />
          <rect x="52" y="64" width="56" height="10" rx="4" fill="#06C755" fillOpacity="0.06" stroke="#06C755" strokeWidth="1" strokeOpacity="0.15" />
          {/* Checkbox */}
          <rect x="52" y="82" width="10" height="10" rx="2" fill="#06C755" fillOpacity="0.08" stroke="#06C755" strokeWidth="1" strokeOpacity="0.2" />
          <path d="M55 87l2 2 4-4" stroke="#06C755" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          <rect x="66" y="85" width="30" height="3" rx="1.5" fill="#06C755" opacity="0.12" />
        </svg>
      );

    case 'coupons':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Ticket shape */}
          <path d="M32 40h96c4 0 4 4 4 4v12a8 8 0 000 16v12c0 4-4 4-4 4H32c-4 0-4-4-4-4V72a8 8 0 000-16V44c0-4 4-4 4-4z" fill="#06C755" fillOpacity="0.08" stroke="#06C755" strokeWidth="1.5" strokeOpacity="0.2" />
          {/* Dashed line */}
          <line x1="100" y1="44" x2="100" y2="84" stroke="#06C755" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.15" />
          {/* Percentage */}
          <text x="60" y="68" textAnchor="middle" fill="#06C755" opacity="0.25" fontSize="20" fontWeight="bold">%</text>
          {/* Stars */}
          <path d="M112 54l1.5-3 1.5 3 3 .5-2 2 .5 3-3-1.5-3 1.5.5-3-2-2z" fill="#06C755" opacity="0.2" />
          <path d="M112 70l1-2 1 2 2 .3-1.5 1.5.3 2-2-1-2 1 .3-2-1.5-1.5z" fill="#06C755" opacity="0.15" />
        </svg>
      );

    case 'reservations':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Calendar */}
          <rect x="40" y="24" width="80" height="72" rx="8" fill="white" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
          <rect x="40" y="24" width="80" height="20" rx="8" fill="#06C755" opacity="0.1" />
          {/* Calendar header dots */}
          <circle cx="56" cy="34" r="2" fill="#06C755" opacity="0.3" />
          <circle cx="80" cy="34" r="2" fill="#06C755" opacity="0.3" />
          <circle cx="104" cy="34" r="2" fill="#06C755" opacity="0.3" />
          {/* Grid */}
          {[52, 64, 76].map((y) => [52, 68, 84, 100].map((x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="10" height="8" rx="2" fill="#06C755" opacity="0.06" />
          )))}
          {/* Highlighted day */}
          <rect x="68" y="64" width="10" height="8" rx="2" fill="#06C755" opacity="0.25" />
          {/* Clock */}
          <circle cx="124" cy="80" r="10" fill="white" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
          <path d="M124 74v6l4 3" stroke="#06C755" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
      );

    case 'analytics':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Bar chart */}
          <rect x="36" y="70" width="14" height="28" rx="3" fill="#06C755" opacity="0.1" />
          <rect x="56" y="50" width="14" height="48" rx="3" fill="#06C755" opacity="0.15" />
          <rect x="76" y="36" width="14" height="62" rx="3" fill="#06C755" opacity="0.2" />
          <rect x="96" y="56" width="14" height="42" rx="3" fill="#06C755" opacity="0.12" />
          <rect x="116" y="44" width="14" height="54" rx="3" fill="#06C755" opacity="0.18" />
          {/* Trend line */}
          <path d="M43 68 63 48 83 34 103 54 123 42" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          {/* Baseline */}
          <line x1="30" y1="98" x2="136" y2="98" stroke="#06C755" strokeWidth="1" opacity="0.15" />
        </svg>
      );

    case 'rich-menus':
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          {/* Phone outline */}
          <rect x="50" y="10" width="60" height="100" rx="10" fill="white" stroke="#06C755" strokeWidth="1.5" opacity="0.2" />
          {/* Screen */}
          <rect x="54" y="18" width="52" height="68" rx="2" fill="#06C755" opacity="0.04" />
          {/* Rich menu area */}
          <rect x="54" y="62" width="52" height="24" rx="2" fill="#06C755" fillOpacity="0.1" stroke="#06C755" strokeWidth="1" strokeOpacity="0.2" />
          {/* Menu grid */}
          <line x1="71" y1="62" x2="71" y2="86" stroke="#06C755" strokeWidth="0.75" opacity="0.15" />
          <line x1="89" y1="62" x2="89" y2="86" stroke="#06C755" strokeWidth="0.75" opacity="0.15" />
          {/* Menu icons */}
          <circle cx="62" cy="74" r="4" fill="#06C755" opacity="0.12" />
          <circle cx="80" cy="74" r="4" fill="#06C755" opacity="0.12" />
          <circle cx="98" cy="74" r="4" fill="#06C755" opacity="0.12" />
          {/* Home button */}
          <rect x="72" y="92" width="16" height="3" rx="1.5" fill="#06C755" opacity="0.1" />
        </svg>
      );

    default: // generic
      return (
        <svg className={base} width="160" height="120" viewBox="0 0 160 120" fill="none">
          <rect x="40" y="24" width="80" height="72" rx="12" fill="#06C755" fillOpacity="0.06" stroke="#06C755" strokeWidth="1.5" strokeDasharray="6 4" strokeOpacity="0.2" />
          <circle cx="80" cy="52" r="12" fill="#06C755" opacity="0.1" />
          <path d="M76 52h8M80 48v8" stroke="#06C755" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          <rect x="60" y="74" width="40" height="4" rx="2" fill="#06C755" opacity="0.1" />
          <rect x="66" y="82" width="28" height="3" rx="1.5" fill="#06C755" opacity="0.06" />
        </svg>
      );
  }
}

export function EmptyState({ illustration, title, description, action, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <Illustration type={illustration} className="mb-6" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4 gap-1.5" size="sm">
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
