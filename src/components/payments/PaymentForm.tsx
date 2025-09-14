import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils-arabic";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

interface PaymentFormProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
}

// Supabase RPC call
const recordPayment = async ({ transactionId, amount }: { transactionId: string; amount: number }) => {
    const { error } = await supabase.rpc('record_payment', {
        p_transaction_id: transactionId,
        p_amount: amount
    });
    if (error) throw new Error(error.message);
    return { success: true };
};

const PaymentForm = ({ transaction, isOpen, onClose }: PaymentFormProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState(transaction.remaining_balance || 0);

  const { mutate, isPending } = useMutation({
      mutationFn: recordPayment,
      onSuccess: () => {
          toast({ title: "تم تسجيل الدفعة بنجاح" });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
          onClose();
      },
      onError: (error: any) => {
          toast({ title: "خطأ", description: error.message, variant: "destructive" });
      }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !amount || amount <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح.", variant: "destructive" });
      return;
    }
    if (amount > transaction.remaining_balance) {
      toast({ title: "خطأ", description: "المبلغ المدفوع أكبر من المبلغ المتبقي.", variant: "destructive" });
      return;
    }

    mutate({ transactionId: transaction.id, amount: Number(amount) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة للمعاملة</DialogTitle>
          <DialogDescription>
            العميل: غير محدد | المبلغ المتبقي: {formatCurrency(transaction.remaining_balance)}

          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>إلغاء</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "حفظ الدفعة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentForm;
