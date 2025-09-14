import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Receipt, DollarSign, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";
import AIInsights from "./AIInsights";
import StatsCard from "./StatsCard";
import { DashboardStats } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

// --- Supabase API Functions ---
const getDashboardStats = async (): Promise<DashboardStats> => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) throw new Error(error.message);
    return data as DashboardStats;
};

const checkOverdueTransactions = async (): Promise<{ message: string }> => {
    const { data, error } = await supabase.rpc('check_overdue_transactions');
    if (error) throw new Error(error.message);
    return { message: data };
};
// --- End Supabase API Functions ---

const Dashboard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats
  });

  const overdueMutation = useMutation({
    mutationFn: checkOverdueTransactions,
    onSuccess: (data) => {
        toast({ title: "Success", description: data.message });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const chartData = [
    { 
      name: 'المالية', 
      'إجمالي الإيرادات': stats?.total_revenue || 0, 
      'إجمالي الأرباح': stats?.total_profit || 0,
      'المبالغ المستحقة': stats?.total_outstanding || 0 
    },
  ];

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-12 w-1/4" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="col-span-4 h-80" />
                <Skeleton className="col-span-3 h-80" />
            </div>
        </div>
    )
  }

  if (!stats) return <div>No stats available.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">لوحة التحكم</h2>
          <p className="text-muted-foreground">نظرة شاملة على أعمالك المالية</p>
        </div>
        <Button onClick={() => overdueMutation.mutate()} disabled={overdueMutation.isPending}>
            <RefreshCw className={`ml-2 h-4 w-4 ${overdueMutation.isPending ? 'animate-spin' : ''}`} />
            {overdueMutation.isPending ? 'جاري الفحص...' : 'فحص المتأخرات'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatsCard title="إجمالي العملاء" value={stats.total_customers} icon={Users} />
        <StatsCard title="المعاملات النشطة" value={stats.total_active_transactions} icon={Receipt} />
        <StatsCard title="إجمالي الإيرادات" value={stats.total_revenue} icon={TrendingUp} variant="success" isCurrency />
        <StatsCard title="إجمالي الأرباح" value={stats.total_profit} icon={TrendingUp} variant="success" isCurrency />
        <StatsCard title="المبالغ المستحقة" value={stats.total_outstanding} icon={DollarSign} variant="warning" isCurrency />
        <StatsCard title="المتأخرات" value={stats.total_overdue} icon={AlertTriangle} variant="danger" isCurrency />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 bg-card shadow-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">نظرة عامة على الإيرادات</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('ar-KW', { style: 'currency', currency: 'KWD' }).format(value)} />
                    <Tooltip formatter={(value) => new Intl.NumberFormat('ar-KW', { style: 'currency', currency: 'KWD' }).format(value as number)} />
                    <Legend />
                    <Bar dataKey="إجمالي الإيرادات" fill="#16a34a" />
                    <Bar dataKey="إجمالي الأرباح" fill="#0ea5e9" />
                    <Bar dataKey="المبالغ المستحقة" fill="#f97316" />
                </BarChart>
            </ResponsiveContainer>
        </div>

        <div className="col-span-3 bg-card shadow-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">إحصائيات سريعة</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">معدل التحصيل</span>
                <span className="font-semibold text-success">
                    {stats.total_revenue > 0 ? `${(((stats.total_revenue - stats.total_outstanding) / stats.total_revenue) * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المعاملات المتأخرة</span>
                <span className="font-semibold text-danger">{stats.overdue_transactions}</span>
              </div>
            </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">تحليلات الذكاء الاصطناعي</h3>
        <AIInsights />
      </div>
    </div>
  );
};

export default Dashboard;