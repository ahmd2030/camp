export interface AiAction {
  id?: string;
  type: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'failed';
  isSensitive: boolean;
  context: Record<string, any>;
  aiReasoning: string;
  costEstimate: number;
  requires_payment?: boolean;
  clientId?: string | null;
  clientName?: string | null;
  createdAt?: any;
  executedAt?: any;
}

export interface DailyBudget {
  date?: string; // YYYY-MM-DD
  dailyLimit: number;
  spent: number;
  currency: string;
}
