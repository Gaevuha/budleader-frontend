export interface DashboardStat {
  id: string;
  title: string;
  value: string;
  trend: string;
  icon?: string;
}

export interface DashboardStatsData {
  stats: DashboardStat[];
}

export interface AdminOrder {
  id: string;
  customerName: string;
  status: string;
  totalAmount: number;
}
