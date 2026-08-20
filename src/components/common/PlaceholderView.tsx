import React from 'react';
import { Card, CardBody } from './Card';
import { Badge } from './Badge';
import { Layers } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  title,
  description = 'The layout and routing foundation is ready. This feature will be integrated with database tables, access controls, and business logic in the next development phase.',
  icon = <Layers className="h-10 w-10 text-primary/40" />,
}) => {
  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 select-none">
      <Card elevation={2} className="text-center p-6 sm:p-8 bg-gradient-to-b from-white to-slate-50/20 border-slate-200">
        <CardBody className="flex flex-col items-center">
          <div className="p-4 bg-primary/5 rounded-full border border-primary/10 mb-4 text-primary shadow-inner">
            {icon}
          </div>
          
          <Badge variant="warning" className="mb-3 uppercase tracking-widest text-[9px] font-black">
            Upcoming Feature
          </Badge>

          <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
          
          <p className="mt-2.5 text-xs text-slate-400 font-semibold leading-relaxed max-w-sm">
            {description}
          </p>

          <div className="mt-6 border-t border-slate-100 w-full pt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            AU PLACERA • Department of AIML
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default PlaceholderView;
