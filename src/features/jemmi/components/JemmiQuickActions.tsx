import React from 'react';
import type { JemmiLanguage, JemmiQuickAction } from '../types/jemmi.types';

interface JemmiQuickActionsProps {
  quickActions: JemmiQuickAction[];
  language: JemmiLanguage;
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
}

export const JemmiQuickActions: React.FC<JemmiQuickActionsProps> = ({
  quickActions,
  language,
  onSelectAction,
  disabled
}) => {
  return (
    <div className="py-2 px-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectAction(action.prompt[language])}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#FF6A00] hover:text-[#FF6A00] dark:hover:text-amber-400 transition-all shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="text-sm leading-none">{action.icon}</span>
            <span>{action.label[language]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
