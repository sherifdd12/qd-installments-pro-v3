import { supabase } from './supabaseClient';
import type { Payment, Transaction } from './types';

// Calculate risk score for a customer based on their history
export async function calculateCustomerRiskScore(customerId: string): Promise<{ score: number; factors: string[]; }> {
  // Call the database function to calculate risk score
  const { data, error } = await supabase
    .rpc('update_customer_risk_score', {
      customer_id_param: customerId
    });

  if (error) throw error;

  return {
    score: data.score,
    factors: data.factors
  };
}

// Predict likelihood of late payment for a transaction
export async function predictLatePayment(transactionId: string): Promise<{
  probability: number;
  nextPaymentDate: Date;
  recommendedAction: string;
}> {
  // Call the database function to predict late payment
  const { data, error } = await supabase
    .rpc('predict_late_payment', {
      transaction_id_param: transactionId
    });

  if (error) throw error;

  return {
    probability: data.probability,
    nextPaymentDate: new Date(data.next_payment_date),
    recommendedAction: data.recommended_action
  };
}

// Interface for document extraction result
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

// Placeholder for document extraction function
// This would need to be connected to an actual OCR/NLP service
export async function extractDocumentDetails(documentUrl: string): Promise<DocumentExtractionResult> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Send the document to an OCR service (e.g., Azure Computer Vision, Google Cloud Vision)
  // 2. Process the OCR results with NLP to extract relevant information
  // 3. Validate and structure the extracted data

  throw new Error('Document extraction feature requires integration with an OCR/NLP service');
}

// Interface for chatbot response
export interface ChatbotResponse {
  message: string;
  suggestedActions?: string[];
  data?: any;
}

// Placeholder for chatbot function
// This would need to be connected to an actual NLP/Chatbot service
export async function processChatbotQuery(
  query: string, 
  customerId?: string
): Promise<{
  message: string;
  suggestedActions?: string[];
  data?: any;
}> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Send the query to an NLP service (e.g., Azure Language Understanding, Dialogflow)
  // 2. Process the intent and entities
  // 3. Fetch relevant data from the database
  // 4. Generate appropriate response

  throw new Error('Chatbot feature requires integration with an NLP service');
}

// Helper function to get overdue transactions that need attention
export async function getOverdueTransactionsNeedingAttention() {
  const { data: predictions, error } = await supabase
    .from('payment_predictions')
    .select(`
      *,
      transaction:transactions(*),
      customer:customers(*)
    `)
    .gt('probability', 0.4)
    .order('probability', { ascending: false });

  if (error) throw error;
  return predictions;
}

// Helper function to get high-risk customers
export async function getHighRiskCustomers() {
  const { data: riskScores, error } = await supabase
    .from('customer_risk_scores')
    .select(`
      *,
      customer:customers(*)
    `)
    .lt('score', 50)
    .order('score', { ascending: true });

  if (error) throw error;
  return riskScores;
}
