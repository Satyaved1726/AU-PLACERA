import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  elevation?: 1 | 2 | 3;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  elevation = 2,
}) => {
  const shadowStyles = {
    1: 'au-card-l1',
    2: 'au-card-l2',
    3: 'au-card-l3'
  };

  return (
    <div
      className={`${shadowStyles[elevation]} ${
        hoverable ? 'hover:shadow-md hover:border-slate-300 hover:-translate-y-[1px]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`px-5 py-4 border-b border-slate-100 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl ${className}`}>
      {children}
    </div>
  );
};

export default Card;
