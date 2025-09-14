import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Transaction, Customer } from "@/lib/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Save } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TransactionFormProps {
  transaction?: Transaction;
  customers: Customer[];
  onSave: (transaction: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const TransactionForm = ({ transaction, customers, onSave, onCancel, isLoading }: TransactionFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    customer_id: transaction?.customer_id || "",
    sequence_number: transaction?.sequence_number || "",
    start_date: transaction?.start_date ? new Date(transaction.start_date) : new Date(),
    number_of_installments: transaction?.number_of_installments || 12,
    installment_amount: transaction?.installment_amount || 0,
    cost_price: transaction?.cost_price || 0,
    extra_price: transaction?.extra_price || 0,
    notes: transaction?.notes || "",
    has_legal_case: transaction?.has_legal_case || false,
    legal_case_details: transaction?.legal_case_details || "",
    courtcollectiondata: transaction?.courtcollectiondata || {},
  });
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const cost = Number(formData.cost_price) || 0;
    const extra = Number(formData.extra_price) || 0;
    setTotalAmount(cost + extra);
  }, [formData.cost_price, formData.extra_price]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.start_date || !formData.number_of_installments || !formData.installment_amount || !formData.cost_price) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة بشكل صحيح",
        variant: "destructive",
      });
      return;
    }

    // Convert dates to ISO string for Supabase
    const dataToSave = {
        ...formData,
        start_date: formData.start_date.toISOString().split('T')[0],
        amount: totalAmount,
        // Set initial remaining balance to amount since no payments yet
        remaining_balance: totalAmount,
        status: 'active'
    };
    onSave(dataToSave);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{transaction ? "تعديل المعاملة" : "إضافة معاملة جديدة"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sequence_number">رقم المعاملة</Label>
              <Input
                id="sequence_number"
                value={formData.sequence_number}
                onChange={(e) => setFormData({ ...formData, sequence_number: e.target.value })}
                disabled={isLoading}
                placeholder="سيتم إنشاؤه تلقائياً"
              />
            </div>
            <div>
              <Label htmlFor="customer">العميل *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={true}
                    className="w-full justify-between"
                    disabled={isLoading || !!transaction}
                  >
                    {formData.customer_id ? customers.find((customer) => customer.id === formData.customer_id)?.full_name : "اختر العميل"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="ابحث عن العميل..." />
                    <CommandEmpty>لم يتم العثور على عملاء</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          value={customer.id}
                          onSelect={() => {
                            setFormData({ ...formData, customer_id: customer.id });
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.customer_id === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {customer.full_name}
                          <span className="ml-2 text-muted-foreground">
                            {customer.mobile_number} (رقم العميل: {customers.find(c => c.id === customer.id)?.sequence_number})
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="start_date">تاريخ المعاملة *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-right font-normal")} disabled={isLoading}>
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(formData.start_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formData.start_date} onSelect={(d) => d && setFormData({...formData, start_date: d})} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="number_of_installments">عدد الأقساط *</Label>
              <Input type="number" value={formData.number_of_installments} onChange={(e) => setFormData({ ...formData, number_of_installments: +e.target.value })} disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="installment_amount">مبلغ القسط الشهري *</Label>
              <Input type="number" step="0.001" value={formData.installment_amount} onChange={(e) => setFormData({ ...formData, installment_amount: +e.target.value })} disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="cost_price">سعر التكلفة *</Label>
              <Input type="number" step="0.001" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: +e.target.value })} disabled={isLoading} />
            </div>
             <div>
              <Label htmlFor="extra_price">السعر الاضافى</Label>
              <Input type="number" step="0.001" value={formData.extra_price} onChange={(e) => setFormData({ ...formData, extra_price: +e.target.value })} disabled={isLoading} />
            </div>
            <div>
              <Label>المبلغ الإجمالي</Label>
              <Input type="text" value={`${totalAmount.toFixed(3)} د.ك.‏`} disabled readOnly className="font-bold text-blue-600" />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} disabled={isLoading} />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">إجراءات قانونية</h3>
            <div className="flex items-center space-x-2">
              <Switch id="legal-case" checked={formData.has_legal_case} onCheckedChange={(checked) => setFormData({ ...formData, has_legal_case: checked })} disabled={isLoading} />
              <Label htmlFor="legal-case">تم رفع قضية قانونية</Label>
            </div>
          </div>

          {formData.has_legal_case && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="legal_case_details">تفاصيل القضية</Label>
                <Textarea id="legal_case_details" value={formData.legal_case_details} onChange={(e) => setFormData({ ...formData, legal_case_details: e.target.value })} disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="courtCollectionData">بيانات تحصيل المحكمة</Label>
                <Textarea 
                  id="courtCollectionData" 
                  value={JSON.stringify(formData.courtcollectiondata || {}, null, 2)} 
                  onChange={(e) => {
                    try {
                      const json = JSON.parse(e.target.value);
                      setFormData({ ...formData, courtcollectiondata: json });
                    } catch {
                      // If invalid JSON, keep the text as is
                      setFormData({ ...formData, courtcollectiondata: {} });
                    }
                  }} 
                  disabled={isLoading} 
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>إلغاء</Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;
