import { z } from 'zod';

// Validation schemas for each table
export const customerSchema = z.object({
  id: z.coerce.number({
    required_error: "رقم العميل مطلوب",
    invalid_type_error: "رقم العميل يجب أن يكون رقم",
  }),
  full_name: z.string({
    required_error: "اسم العميل مطلوب",
  }).min(2, "اسم العميل يجب أن يكون على الأقل حرفين"),
  mobile_number: z.string({
    required_error: "رقم الموبايل مطلوب",
  }).regex(/^\+?[0-9]{8,15}$/, "رقم الموبايل غير صالح"),
  mobile_number2: z.string().regex(/^\+?[0-9]{8,15}$/, "رقم الموبايل الثاني غير صالح").nullable().optional(),
});

export const transactionSchema = z.object({
  id: z.coerce.number({
    required_error: "رقم المعاملة مطلوب",
    invalid_type_error: "رقم المعاملة يجب أن يكون رقم",
  }),
  customer_id: z.coerce.number({
    required_error: "رقم العميل مطلوب",
    invalid_type_error: "رقم العميل يجب أن يكون رقم",
  }),
  cost_price: z.coerce.number({
    invalid_type_error: "سعر السلعة يجب أن يكون رقم",
  }).min(0, "سعر السلعة يجب أن يكون أكبر من صفر").optional(),
  amount: z.coerce.number({
    required_error: "إجمالي السعر مطلوب",
    invalid_type_error: "إجمالي السعر يجب أن يكون رقم",
  }).min(0, "إجمالي السعر يجب أن يكون أكبر من صفر"),
  number_of_installments: z.coerce.number({
    required_error: "عدد الدفعات مطلوب",
    invalid_type_error: "عدد الدفعات يجب أن يكون رقم",
  }).min(1, "عدد الدفعات يجب أن يكون أكبر من صفر"),
  installment_amount: z.coerce.number({
    invalid_type_error: "قيمة القسط يجب أن يكون رقم",
  }).min(0, "قيمة القسط يجب أن يكون أكبر من صفر").optional(),
  start_date: z.coerce.date({
    required_error: "تاريخ بدء القرض مطلوب",
    invalid_type_error: "تاريخ غير صالح",
  }),
  legal_case_details: z.string().optional(),
});

export const paymentSchema = z.object({
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
    invalid_type_error: "قيمة الدفعة يجب أن تكون رقم",
  }).min(0, "قيمة الدفعة يجب أن تكون أكبر من صفر"),
  payment_date: z.coerce.date({
    required_error: "تاريخ الدفعة مطلوب",
    invalid_type_error: "تاريخ غير صالح",
  }),
  balance_after: z.coerce.number().min(0).optional(),
  balance_before: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export const phoneNumberValidation = (phoneNumber: string | undefined): boolean => {
  if (!phoneNumber) return true; // Allow missing phone numbers

  // Allow phone numbers with 8 or more digits
  const phoneRegex = /^\d{8,}$/;
  return phoneRegex.test(phoneNumber);
};
