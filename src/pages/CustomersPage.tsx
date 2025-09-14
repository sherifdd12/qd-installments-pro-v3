import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomerList from "@/components/customers/CustomerList";
import CustomerForm from "@/components/customers/CustomerForm";
import { Customer } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

// --- Supabase API Functions ---
const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data as Customer[];
};

const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updatedAt'>): Promise<any> => {
    const { data, error } = await supabase.from('customers').insert([customer]).select();
    if (error) throw new Error(error.message);
    return data;
};

const updateCustomer = async (customer: Partial<Customer>): Promise<any> => {
    const { id, ...updateData } = customer;
    const { data, error } = await supabase.from('customers').update(updateData).eq('id', id);
    if (error) throw new Error(error.message);
    return data;
};
// --- End Supabase API Functions ---

const CustomersPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();

  const { data: customers, isLoading, isError } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const addMutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowCustomerForm(false);
      toast({ title: "تم إضافة العميل بنجاح" });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowCustomerForm(false);
      setEditingCustomer(undefined);
      toast({ title: "تم تحديث العميل بنجاح" });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });

  const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'created_at' | 'updatedAt'>) => {
    if (editingCustomer) {
        updateMutation.mutate({ ...customerData, id: editingCustomer.id });
    } else {
        addMutation.mutate(customerData);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleAddCustomer = () => {
    setEditingCustomer(undefined);
    setShowCustomerForm(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    // TODO: Implement customer detail view
    console.log("View customer:", customer);
  };

  if (isLoading) return <div>جاري تحميل العملاء...</div>;
  if (isError) return <div>خطأ في تحميل العملاء</div>;

  if (showCustomerForm) {
    return (
      <CustomerForm
        customer={editingCustomer}
        onSave={handleSaveCustomer}
        onCancel={() => {
          setShowCustomerForm(false);
          setEditingCustomer(undefined);
        }}
        isLoading={addMutation.isPending || updateMutation.isPending}
      />
    );
  }

  return (
    <CustomerList
      customers={customers || []}
      onAddCustomer={handleAddCustomer}
      onEditCustomer={handleEditCustomer}
      onViewCustomer={handleViewCustomer}
    />
  );
};

export default CustomersPage;
