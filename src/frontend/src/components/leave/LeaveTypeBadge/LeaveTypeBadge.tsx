import { Badge } from '../../core/Badge/Badge';
import type { BadgeVariant } from '../../core/Badge/Badge';

export type LeaveTypeBadgeProps = {
  typeName: string;
  className?: string;
};

export function LeaveTypeBadge({ typeName, className }: LeaveTypeBadgeProps) {
  const getBadgeVariant = (name: string): BadgeVariant => {
    const normalized = name.toLowerCase();
    if (normalized.includes('vacation')) return 'vacation';
    if (normalized.includes('sick')) return 'sick';
    if (normalized.includes('holiday')) return 'holiday';
    return 'other';
  };

  return (
    <Badge variant={getBadgeVariant(typeName)} className={className} data-test="LeaveTypeBadge">
      {typeName}
    </Badge>
  );
}
