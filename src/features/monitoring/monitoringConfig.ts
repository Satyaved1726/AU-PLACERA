export interface QuotaLimit {
  label: string;
  limit: number;
  formattedLimit: string;
  unit: 'bytes' | 'count';
}

export const MONITORING_QUOTAS: Record<string, QuotaLimit> = {
  database: {
    label: 'Database',
    limit: 500 * 1024 * 1024, // 500 MB
    formattedLimit: '500 MB',
    unit: 'bytes'
  },
  storage: {
    label: 'Storage',
    limit: 1024 * 1024 * 1024, // 1 GB
    formattedLimit: '1 GB',
    unit: 'bytes'
  },
  egress: {
    label: 'Egress',
    limit: 5 * 1024 * 1024 * 1024, // 5 GB
    formattedLimit: '5 GB',
    unit: 'bytes'
  },
  cachedEgress: {
    label: 'Cached Egress',
    limit: 5 * 1024 * 1024 * 1024, // 5 GB
    formattedLimit: '5 GB',
    unit: 'bytes'
  },
  mau: {
    label: 'Monthly Active Users',
    limit: 50000,
    formattedLimit: '50,000',
    unit: 'count'
  },
  realtimeConnections: {
    label: 'Realtime Connections',
    limit: 200,
    formattedLimit: '200',
    unit: 'count'
  },
  realtimeMessages: {
    label: 'Realtime Messages',
    limit: 2000000,
    formattedLimit: '2,000,000',
    unit: 'count'
  },
  edgeFunctions: {
    label: 'Edge Function Invocations',
    limit: 500000,
    formattedLimit: '500,000',
    unit: 'count'
  }
};

export const THRESHOLDS = {
  healthy: 70,    // 0-70%
  warning: 85,    // 70-85%
  highUsage: 95,  // 85-95%
};

export type HealthStatus = 'Healthy' | 'Warning' | 'High Usage' | 'Critical';

export function getStatusFromPercentage(percentage: number): HealthStatus {
  if (percentage <= THRESHOLDS.healthy) return 'Healthy';
  if (percentage <= THRESHOLDS.warning) return 'Warning';
  if (percentage <= THRESHOLDS.highUsage) return 'High Usage';
  return 'Critical';
}

export function getStatusBadgeVariant(status: HealthStatus): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'Healthy':
      return 'success';
    case 'Warning':
      return 'warning';
    case 'High Usage':
      return 'warning';
    case 'Critical':
      return 'error';
    default:
      return 'neutral';
  }
}
