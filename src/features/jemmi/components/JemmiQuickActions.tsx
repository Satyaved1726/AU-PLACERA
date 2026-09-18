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
    <div className="py-1.5 px-3 border-t border-slate-100 bg-[#F8FAFC] flex-shrink-0">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectAction(action.prompt[language])}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-[#0B3C5D] hover:text-[#0B3C5D] hover:bg-slate-50 transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <span className="text-xs leading-none">{action.icon}</span>
            <span className="whitespace-nowrap">{action.label[language]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
