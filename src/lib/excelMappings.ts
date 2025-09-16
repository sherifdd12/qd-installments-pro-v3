export const EXCEL_MAPPINGS = {
  customers: {
    'كود': 'id',
    'أسماء العملاء': 'full_name',
    'Mobile': 'mobile_number',
    'Mobile2': 'mobile_number2'
  },
  transactions: {
    'رقم البيع': 'id',
    'رقم العميل': 'customer_id',
    'سعر السلعة': 'cost_price',
    'إجمالي السعر': 'amount',
    'عدد الدفعات': 'number_of_installments',
    'القسط الشهرى': 'installment_amount',
    'تاريخ بدء القرض': 'start_date',
    'اتعاب محاماه': 'legal_case_details'
  },
  payments: {
    'كود': 'customer_id',
    'رقم البيع': 'transaction_id',
    'قيمة الدفعة': 'amount',
    'تاريخ الدفعة': 'payment_date',
    'المتبقى': 'balance_after',
    'الدين المستحق': 'balance_before',
    'notes': 'notes'
  }
};
