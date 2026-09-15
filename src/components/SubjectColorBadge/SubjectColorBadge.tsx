import React from 'react';
import { Lock } from 'lucide-react';
import { getBorderColor } from '../../utils/colorUtils';

interface SubjectColorBadgeProps {
  color: string;
  size?: 'sm' | 'md' | 'lg';
  isLocked?: boolean;
  className?: string;
  title?: string;
}

export const SubjectColorBadge: React.FC<SubjectColorBadgeProps> = ({
  color,
  size = 'md',
  isLocked = false,
  className = '',
  title,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 rounded-full',
    md: 'w-6 h-6 rounded-lg',
    lg: 'w-8 h-8 rounded-lg',
  };

  const border = getBorderColor(color);

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center transition-transform shadow-2xs ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: color,
        border: `1.5px solid ${border}`,
      }}
      title={title}
    >
      {isLocked && (
        <Lock
          className={`text-slate-600 drop-shadow-xs ${
            size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
          }`}
        />
      )}
    </div>
  );
};
