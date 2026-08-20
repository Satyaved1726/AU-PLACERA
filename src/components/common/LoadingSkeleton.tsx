import React from 'react';
import { Card, CardBody } from './Card';

// 1. Generic Loader
interface LoadingSkeletonProps {
  count?: number;
  type?: 'card' | 'list' | 'stat';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 3,
  type = 'card',
}) => {
  const skeletons = Array.from({ length: count });

  if (type === 'list') {
    return (
      <div className="space-y-4 animate-pulse">
        {skeletons.map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border border-slate-200 rounded-lg bg-white">
            <div className="h-10 w-10 bg-slate-200 rounded-full" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-3 bg-slate-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stat') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {skeletons.map((_, i) => (
          <Card key={i}>
            <CardBody className="p-6">
              <div className="h-3 bg-slate-200 rounded w-1/3 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-pulse">
      {skeletons.map((_, i) => (
        <Card key={i}>
          <CardBody className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-12" />
            </div>
            <div className="space-y-2 mb-6">
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-5/6" />
              <div className="h-3 bg-slate-200 rounded w-4/6" />
            </div>
            <div className="flex gap-3">
              <div className="h-8 bg-slate-200 rounded w-20" />
              <div className="h-8 bg-slate-200 rounded w-28" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

// 2. Post Notices List Skeleton
export const PostSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded" />
          </div>
          <div className="h-6 w-2/3 bg-slate-200 rounded mt-2" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-5/6 bg-slate-100 rounded" />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-8 w-28 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. Roster List Skeleton
export const StudentSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-4 w-24 bg-slate-150 rounded" />
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

// 4. Admin Dashboard Metrics Skeleton
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl h-64" />
        <div className="bg-white border border-slate-200 rounded-xl h-64" />
      </div>
    </div>
  );
};

// 5. User Profile Card Skeleton
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-pulse max-w-xl mx-auto">
      <div className="h-20 bg-slate-200" />
      <div className="p-6 space-y-6 pt-0">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
          <div className="h-20 w-20 rounded-full bg-slate-300 border-4 border-white" />
          <div className="space-y-2 py-1 flex-1">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-3.5 w-48 bg-slate-150 rounded" />
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t border-slate-100">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="flex justify-between items-center py-1">
              <div className="h-4 w-24 bg-slate-150 rounded" />
              <div className="h-4 w-32 bg-slate-250 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default LoadingSkeleton;
