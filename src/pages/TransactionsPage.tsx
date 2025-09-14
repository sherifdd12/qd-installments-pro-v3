import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TransactionList from "@/components/transactions/TransactionList";
import TransactionForm from "@/components/transactions/TransactionForm";
import PaymentForm from "@/components/payments/PaymentForm";
import { Transaction, Customer } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/utils-arabic";

// --- Supabase API Functions ---
const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            id,
            sequence_number,
            customer_id,
            cost_price,
            extra_price,
            amount,
            profit,
            installment_amount,
            start_date,
            number_of_installments,
            remaining_balance,
            status,
            has_legal_case,
            notes,
            created_at,
            customers (id, full_name, mobile_number)
        `)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to latest 50 transactions for better performance

    if (error) throw new Error(error.message);

    const mappedData = data.map((t: any) => {
        const { customers, ...rest } = t;
        return {
            ...rest,
            customer: customers,
        };
    });

    return { data: mappedData as Transaction[], count: count ?? 0 };
};

const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw new Error(error.message);
    return data as Customer[];
};

const addTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at' | 'customerName' | 'mobileNumber'>): Promise<any> => {
    const { data, error } = await supabase.from('transactions').insert([transaction]).select();
    if (error) throw new Error(error.message);
    return data;
};

const updateTransaction = async (transaction: Partial<Transaction>): Promise<any> => {
    const { id, ...updateData } = transaction;
    const { data, error } = await supabase.from('transactions').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    return data;
};

const deleteTransaction = async (transactionId: string): Promise<any> => {
    const { data, error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) throw new Error(error.message);
    return data;
}
// --- End Supabase API Functions ---

const DEFAULT_MESSAGE_TEMPLATE = "عزيزي [CustomerName]،\nنود تذكيركم بأن قسطكم بمبلغ [Amount] دينار كويتي مستحق الدفع.\nالرصيد المتبقي: [Balance] دينار كويتي.\nشكرًا لتعاونكم.";


const TransactionsPage = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
    const [paymentTransaction, setPaymentTransaction] = useState<Transaction | null>(null);

    const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
        queryKey: ["transactions"],
        queryFn: getTransactions,
    });

    const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
        queryKey: ["customers"],
        queryFn: getCustomers,
    });

    const addMutation = useMutation({
        mutationFn: addTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", "dashboardStats"] });
            setShowForm(false);
            toast({ title: "تمت إضافة المعاملة بنجاح" });
        },
        onError: (error: any) => toast({ title: "خطأ", description: error.message, variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: updateTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", "dashboardStats"] });
            setShowForm(false);
            setEditingTransaction(undefined);
            toast({ title: "تم تحديث المعاملة بنجاح" });
        },
        onError: (error: any) => toast({ title: "خطأ", description: error.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions", "dashboardStats"] });
            toast({ title: "تم حذف المعاملة بنجاح" });
        },
        onError: (error: any) => toast({ title: "خطأ", description: error.message, variant: "destructive" }),
    });

    const handleSave = (formData: any) => {
        if (editingTransaction) {
            updateMutation.mutate({ ...formData, id: editingTransaction.id });
        } else {
            const totalAmount = formData.totalInstallments * formData.installmentAmount;
            addMutation.mutate({ ...formData, totalAmount, remainingBalance: totalAmount });
        }
    };

    const handleSendReminder = (transaction: Transaction) => {
        const template = localStorage.getItem('whatsappMessageTemplate') || DEFAULT_MESSAGE_TEMPLATE;
        const message = template
            .replace('[CustomerName]', 'عميل')
            .replace('[Amount]', formatCurrency(transaction.installment_amount))
            .replace('[Balance]', formatCurrency(transaction.remaining_balance));

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    if (isLoadingTransactions || isLoadingCustomers) return <div>جاري التحميل...</div>;

    return (
        <div>
            {showForm ? (
                <TransactionForm
                    transaction={editingTransaction}
                    customers={customers || []}
                    onSave={handleSave}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingTransaction(undefined);
                    }}
                    isLoading={addMutation.isPending || updateMutation.isPending}
                />
            ) : (
                <>
                    <TransactionList
                        transactions={transactions || []}
                        onAddTransaction={() => {
                            setEditingTransaction(undefined);
                            setShowForm(true);
                        }}
                        onEditTransaction={(transaction) => {
                            setEditingTransaction(transaction);
                            setShowForm(true);
                        }}
                        onDeleteTransaction={(id) => deleteMutation.mutate(id)}
                        onRecordPayment={(transaction) => setPaymentTransaction(transaction)}
                        onSendReminder={handleSendReminder}
                    />
                    {paymentTransaction && (
                        <PaymentForm
                            transaction={paymentTransaction}
                            isOpen={!!paymentTransaction}
                            onClose={() => setPaymentTransaction(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default TransactionsPage;
