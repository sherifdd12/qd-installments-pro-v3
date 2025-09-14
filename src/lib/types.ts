// Type definitions for the Arabic Installment Sales Management System

export interface CustomerRiskScore {
  customerId: string;
  score: number;
  factors: string[];
  lastUpdated: Date;
}

export interface PaymentPrediction {
  customerId: string;
  transactionId: string;
  probability: number;
  nextPaymentDate: Date;
  recommendedAction: string;
  lastUpdated: Date;
}

export interface DocumentExtractionResult {
  customerDetails: {
    fullName?: string;
    civilId?: string;
    mobileNumber?: string;
  };
  transactionDetails: {
    amount?: number;
    installmentAmount?: number;
    startDate?: string;
    numberOfInstallments?: number;
  };
  confidenceScore: number;
}

export interface ChatbotResponse {
  message: string;
  suggestedActions?: string[];
  data?: any;
}

export interface Customer {
  id: string;
  sequence_number: string;
  full_name: string;
  mobile_number: string;
  alternate_phone?: string;
  civil_id?: string;
  created_at: Date;
}

export interface Transaction {
  id: string;
  sequence_number: string;
  customer_id: string;
  cost_price: number;     // سعر السلعة
  extra_price: number;    // السعر الاضافى
  amount: number;         // إجمالي السعر = سعر السلعة + السعر الاضافى
  profit: number;         // الربح = السعر الاضافى
  installment_amount: number;
  start_date: Date;
  number_of_installments: number;
  remaining_balance: number;
  status: 'active' | 'completed' | 'overdue' | 'legal';
  has_legal_case: boolean;
  legal_case_details?: string;
  notes?: string;
  courtcollectiondata?: {
    [key: string]: any;
  };
  created_at: Date;
  // Joined fields
  customer?: Customer;
}

export interface Payment {
  id: string;
  transaction_id: string;
  customer_id: string;
  amount: number;
  payment_date: Date;
  balance_before: number;
  balance_after: number;
  notes?: string;
  created_at: Date;
  // Joined fields
  transaction?: Transaction;
  customer?: Customer;
}

export interface DashboardStats {
  total_customers: number;
  total_active_transactions: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  total_outstanding: number;
  total_overdue: number;
  overdue_transactions: number;
}

export type TransactionStatus = 'active' | 'completed' | 'overdue' | 'legal_case';

export interface ExportRow {
  description: string;
  amount: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  mobileNumber: string;
  dueDate: string;
  reference: string;
  notes: string;
  expiry: string;
}