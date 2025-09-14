import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingDown, UserX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { calculateCustomerRiskScore, getHighRiskCustomers, getOverdueTransactionsNeedingAttention } from '@/lib/aiFeatures';

const AIInsights = () => {
  const { data: highRiskCustomers, isLoading: loadingRisk } = useQuery({
    queryKey: ['highRiskCustomers'],
    queryFn: getHighRiskCustomers,
  });

  const { data: overdueTransactions, isLoading: loadingOverdue } = useQuery({
    queryKey: ['overdueTransactions'],
    queryFn: getOverdueTransactionsNeedingAttention,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            العملاء عالي المخاطر
          </CardTitle>
          <CardDescription>
            العملاء الذين لديهم درجة مخاطر أعلى من 50%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRisk ? (
            <p>جاري التحميل...</p>
          ) : (
            <div className="space-y-2">
              {highRiskCustomers?.slice(0, 5).map((score) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{score.customer.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {score.factors.join('، ')}
                    </p>
                  </div>
                  <Badge variant={score.score < 30 ? 'destructive' : 'secondary'}>
                    {score.score}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-warning" />
            تنبؤات التأخر في السداد
          </CardTitle>
          <CardDescription>
            المعاملات المتوقع تأخرها في السداد
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOverdue ? (
            <p>جاري التحميل...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>احتمالية التأخر</TableHead>
                  <TableHead>الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueTransactions?.slice(0, 5).map((prediction) => (
                  <TableRow key={prediction.id}>
                    <TableCell>{prediction.customer.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={prediction.probability > 0.7 ? 'destructive' : 'secondary'}>
                        {Math.round(prediction.probability * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {prediction.recommended_action}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            تحليلات الذكاء الاصطناعي
          </CardTitle>
          <CardDescription>
            نظرة عامة على تحليلات النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="font-medium">تحليل المخاطر</p>
              <p className="text-sm text-muted-foreground">
                {highRiskCustomers?.length || 0} عميل في منطقة الخطر
              </p>
            </div>
            <div>
              <p className="font-medium">توقعات التأخر</p>
              <p className="text-sm text-muted-foreground">
                {overdueTransactions?.length || 0} معاملة متوقع تأخرها
              </p>
            </div>
            <Button variant="outline" className="w-full">
              عرض التقرير الكامل
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsights;
