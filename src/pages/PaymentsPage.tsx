import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PaymentList from "@/components/payments/PaymentList";
import { Payment } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

// --- Supabase API Functions ---
const getPayments = async (): Promise<Payment[]> => {
    const { data, error } = await supabase
        .from('payments')
        .select(`
            *,
            customer:customers (full_name),
            transaction:transactions (sequence_number)
        `)
        .order('payment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Payment[];
};

const deletePayment = async (paymentId: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) throw new Error(error.message);
};
// --- End Supabase API Functions ---

const PaymentsPage = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: payments, isLoading, isError } = useQuery<Payment[]>({
        queryKey: ["payments"],
        queryFn: getPayments,
    });

    const deleteMutation = useMutation({
        mutationFn: deletePayment,
        onSuccess: () => {
            toast({ title: "تم حذف الدفعة بنجاح" });
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        },
        onError: (error: any) => {
            toast({ title: "خطأ", description: error.message, variant: "destructive" });
        },
    });

    if (isLoading) return <div>جاري تحميل المدفوعات...</div>;
    if (isError) return <div>خطأ في تحميل المدفوعات</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">المدفوعات</h1>
            <PaymentList
                payments={payments || []}
                onDeletePayment={(paymentId) => deleteMutation.mutate(paymentId)}
            />
        </div>
    );
};

export default PaymentsPage;
