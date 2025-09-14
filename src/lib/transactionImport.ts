import { supabase } from './supabaseClient';
import { Transaction, Customer } from './types';

interface TransactionImportRow {
  [key: string]: string | number;
}

interface CustomerValidationResult {
  id: string;
  sequence_number: string;
}

export const validateAndMapCustomers = async (
  rows: TransactionImportRow[],
  customerSequenceField: string
): Promise<{ errors: string[]; validatedRows: (Omit<TransactionImportRow, 'validated_customer'> & { validated_customer: CustomerValidationResult })[] }> => {
  // Get all customers
  const { data: customers } = await supabase
    .from("customers")
    .select("id, sequence_number, full_name")
    .order("created_at");

  if (!customers) {
    throw new Error("فشل في جلب بيانات العملاء");
  }

  const customerMap = new Map(
    customers.map(c => [c.sequence_number, { id: c.id, sequence_number: c.sequence_number }])
  );

  const errors: string[] = [];
  const validatedRows: (Omit<TransactionImportRow, 'validated_customer'> & { validated_customer: CustomerValidationResult })[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because Excel starts at 1 and has header
    const customerSeq = row[customerSequenceField]?.toString();

    if (!customerSeq) {
      errors.push(`صف ${rowNumber}: رقم العميل غير موجود`);
      return;
    }

    const customer = customerMap.get(customerSeq);
    if (!customer) {
      errors.push(`صف ${rowNumber}: لم يتم العثور على عميل برقم ${customerSeq}`);
      return;
    }

    const { validated_customer: _, ...restRow } = row as any;
    validatedRows.push({ ...restRow, validated_customer: customer });
  });

  return { errors, validatedRows };
};

export const importTransactions = async (
  rows: TransactionImportRow[],
  mapping: {
    customer_sequence: string;  // رقم العميل
    sequence_number?: string;   // رقم البيع (optional)
    cost_price: string;        // سعر السلعة
    extra_price: string;       // السعر الاضافى
    number_of_installments: string;  // عدد الدفعات
    start_date: string;        // تاريخ البدء
    notes?: string;           // ملاحظات
  }
) => {
  // First validate all customers
  const { errors, validatedRows } = await validateAndMapCustomers(
    rows,
    mapping.customer_sequence
  );

  if (errors.length > 0) {
    throw new Error("أخطاء في بيانات العملاء:\n" + errors.join("\n"));
  }

  // Map validated rows to transactions
  const transactions = validatedRows.map(row => {
    const cost_price = Number(row[mapping.cost_price]);
    const extra_price = Number(row[mapping.extra_price]);
    const total_amount = cost_price + extra_price;
    const number_of_installments = Number(row[mapping.number_of_installments]);
    const installment_amount = Math.round((total_amount / number_of_installments) * 1000) / 1000;
    const start_date = new Date(row[mapping.start_date]);

    const transaction: Omit<Transaction, 'id'> = {
      sequence_number: mapping.sequence_number ? row[mapping.sequence_number]?.toString() : '',
      customer_id: row.validated_customer.id,
      cost_price,
      extra_price,
      amount: total_amount,
      profit: extra_price,
      installment_amount,
      start_date,
      number_of_installments,
      remaining_balance: total_amount,
      status: 'active',
      has_legal_case: false,
      notes: mapping.notes ? row[mapping.notes]?.toString() : undefined,
      created_at: new Date()
    };

    return transaction;
  });

  // Insert transactions
  const { data: savedTransactions, error } = await supabase
    .from("transactions")
    .insert(transactions)
    .select();

  if (error) {
    throw error;
  }

  return savedTransactions;
};

// Excel column configuration
export const TRANSACTION_TABLE_CONFIG = {
  table: "transactions",
  columns: [
    { 
      key: "sequence_number", 
      excelHeader: "رقم البيع",
      required: false 
    },
    { 
      key: "customer_sequence", 
      excelHeader: "رقم العميل",
      required: true 
    },
    { 
      key: "cost_price", 
      excelHeader: "سعر السلعة",
      required: true,
      type: "number" 
    },
    { 
      key: "extra_price", 
      excelHeader: "السعر الاضافى",
      required: true,
      type: "number" 
    },
    { 
      key: "number_of_installments", 
      excelHeader: "عدد الدفعات",
      required: true,
      type: "number" 
    },
    { 
      key: "start_date", 
      excelHeader: "تاريخ البدء",
      required: true,
      type: "date" 
    },
    { 
      key: "notes", 
      excelHeader: "ملاحظات",
      required: false 
    }
  ]
};
