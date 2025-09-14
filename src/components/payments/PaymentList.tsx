import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Payment } from "@/lib/types";
import { formatCurrency, formatArabicDate } from "@/lib/utils-arabic";
import { Trash2 } from "lucide-react";

interface PaymentListProps {
  payments: Payment[];
  onDeletePayment: (paymentId: string) => void;
}

const PaymentList = ({ payments, onDeletePayment }: PaymentListProps) => {
  const { hasRole } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل المدفوعات</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>رقم المعاملة</TableHead>
              <TableHead>المبلغ المدفوع</TableHead>
              <TableHead>الرصيد بعد الدفعة</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.customer?.full_name || 'غير متوفر'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{payment.transaction?.sequence_number || 'N/A'}</Badge>
                </TableCell>
                <TableCell className="text-green-600 font-medium">{formatCurrency(payment.amount)}</TableCell>
                <TableCell>{formatCurrency(payment.balance_after)}</TableCell>
                <TableCell>{formatArabicDate(new Date(payment.payment_date))}</TableCell>
                <TableCell>
                  {hasRole('admin') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePayment(payment.id)}
                        title="حذف الدفعة"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PaymentList;
