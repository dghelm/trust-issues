import { type Hash } from 'viem';

export interface QueuedTransaction {
  id: number;
  params: {
    to: string;
    value?: string;
    data?: string;
    gas?: string;
  };
  topic: string;
  requestId: number;
}

export interface CompletedTransaction {
  id: number;
  hash: Hash;
  timestamp: number;
  to: string;
  value: string;
}
