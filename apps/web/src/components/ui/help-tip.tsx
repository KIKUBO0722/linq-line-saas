import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  iconClassName?: string;
}

/**
 * HelpTip - ? icon with tooltip for contextual help throughout the app.
 *
 * Usage:
 *   <HelpTip content="この機能は友だちにメッセージを一斉配信します" />
 *   <h2>分析 <HelpTip content="配信パフォーマンスを確認できます" /></h2>
 */
export function HelpTip({ content, side = 'top', className, iconClassName }: HelpTipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755]/50',
              className,
            )}
            aria-label="ヘルプ"
          >
            <HelpCircle className={cn('h-4 w-4', iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-[280px] text-[13px] leading-relaxed"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SectionHeaderProps {
  title: string;
  help?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * SectionHeader - page/card section title with optional help tooltip.
 *
 * Usage:
 *   <SectionHeader title="コンバージョン" help="友だちが目標アクションを達成した割合です" />
 */
export function SectionHeader({ title, help, className, children }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {help && <HelpTip content={help} />}
      {children}
    </div>
  );
}
