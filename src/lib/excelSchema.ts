import { defineConfig } from './excelConfig';
import { z } from 'zod';

// Define table schemas
export const schemas = {
  customers: z.object({
    id: z.coerce.number({
      required_error: "رقم العميل مطلوب",
      invalid_type_error: "رقم العميل يجب أن يكون رقم",
    }),
    full_name: z.string({
      required_error: "اسم العميل مطلوب",
    }).min(2, "اسم العميل يجب أن يكون على الأقل حرفين"),
    mobile_number: z.string({
      required_error: "رقم الموبايل مطلوب",
    }).regex(/^01[0125][0-9]{8}$/, "رقم الموبايل غير صالح"),
    mobile_number2: z.string().regex(/^01[0125][0-9]{8}$/, "رقم الموبايل الثاني غير صالح").optional(),
  }),

  transactions: z.object({
    id: z.coerce.number({
      required_error: "رقم المعاملة مطلوب",
      invalid_type_error: "رقم المعاملة يجب أن يكون رقم",
    }),
    customer_id: z.coerce.number({
      required_error: "رقم العميل مطلوب",
      invalid_type_error: "رقم العميل يجب أن يكون رقم",
    }),
    cost_price: z.coerce.number().min(0).optional(),
    amount: z.coerce.number({
      required_error: "إجمالي السعر مطلوب",
    }).min(0),
    number_of_installments: z.coerce.number({
      required_error: "عدد الدفعات مطلوب",
    }).min(1),
    installment_amount: z.coerce.number().min(0).optional(),
    start_date: z.coerce.date({
      required_error: "تاريخ بدء القرض مطلوب",
      invalid_type_error: "تاريخ غير صالح",
    }),
    legal_case_details: z.string().optional(),
  }),

  payments: z.object({
    customer_id: z.coerce.number({
      required_error: "رقم العميل مطلوب",
      invalid_type_error: "رقم العميل يجب أن يكون رقم",
    }),
    transaction_id: z.coerce.number({
      required_error: "رقم المعاملة مطلوب",
      invalid_type_error: "رقم المعاملة يجب أن يكون رقم",
    }),
    amount: z.coerce.number({
      required_error: "قيمة الدفعة مطلوبة",
    }).min(0),
    payment_date: z.coerce.date({
      required_error: "تاريخ الدفعة مطلوب",
      invalid_type_error: "تاريخ غير صالح",
    }),
    balance_after: z.coerce.number().min(0).optional(),
    balance_before: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  }),
} as const;

// Define Excel mappings
export const config = defineConfig({
  tables: {
    customers: {
      name: 'العملاء',
      mappings: {
        'كود': 'id',
        'أسماء العملاء': 'full_name',
        'Mobile': 'mobile_number',
        'Mobile2': 'mobile_number2',
      },
      schema: schemas.customers,
    },
    transactions: {
      name: 'المعاملات',
      mappings: {
        'رقم البيع': 'id',
        'رقم العميل': 'customer_id',
        'سعر السلعة': 'cost_price',
        'إجمالي السعر': 'amount',
        'عدد الدفعات': 'number_of_installments',
        'القسط الشهرى': 'installment_amount',
        'تاريخ بدء القرض': 'start_date',
        'اتعاب محاماه': 'legal_case_details',
      },
      schema: schemas.transactions,
    },
    payments: {
      name: 'الدفعات',
      mappings: {
        'كود': 'customer_id',
        'رقم البيع': 'transaction_id',
        'قيمة الدفعة': 'amount',
        'تاريخ الدفعة': 'payment_date',
        'المتبقى': 'balance_after',
        'الدين المستحق': 'balance_before',
        'notes': 'notes',
      },
      schema: schemas.payments,
    },
  },
});
