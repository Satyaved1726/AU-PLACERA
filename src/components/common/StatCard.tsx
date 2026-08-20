import React from 'react';
import { Card, CardBody } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    type: 'up' | 'down';
    text: string;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
}) => {
  return (
    <Card elevation={2} className="overflow-hidden hover:-translate-y-0.5 hover:shadow-soft">
      <CardBody className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
            <h3 className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">{value}</h3>
          </div>
          {icon && (
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-primary shadow-sm shrink-0">
              {icon}
            </div>
          )}
        </div>
        
        {(description || trend) && (
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100/60 pt-3">
            {trend && (
              <span className={`font-black ${trend.type === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend.type === 'up' ? '↑' : '↓'} {trend.text}
              </span>
            )}
            <span className="text-slate-400">{description}</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default StatCard;
