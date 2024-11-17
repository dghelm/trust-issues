import { useState } from 'react';
import { type Hash } from 'viem';
import { type QueuedTransaction, type CompletedTransaction } from '../types';

export function useTransactionQueue() {
  const [queuedTransactions, setQueuedTransactions] = useState<
    QueuedTransaction[]
  >([]);
  const [completedTransactions, setCompletedTransactions] = useState<
    CompletedTransaction[]
  >([]);
  const [processingTx, setProcessingTx] = useState<number | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<Hash | null>(null);
  const [txStatus, setTxStatus] = useState('');
  const [manualCheckEnabled, setManualCheckEnabled] = useState(false);

  const addToQueue = (transaction: QueuedTransaction) => {
    setQueuedTransactions((prev) => [...prev, transaction]);
  };

  const completeTransaction = (tx: QueuedTransaction, hash: Hash) => {
    const completedTx: CompletedTransaction = {
      id: tx.id,
      hash,
      timestamp: Date.now(),
      to: tx.params.to,
      value: tx.params.value?.toString() || '0',
    };
    setCompletedTransactions((prev) => [completedTx, ...prev].slice(0, 10));
    setQueuedTransactions((prev) => prev.filter((t) => t.id !== tx.id));
  };

  return {
    queuedTransactions,
    completedTransactions,
    processingTx,
    pendingTxHash,
    txStatus,
    manualCheckEnabled,
    setProcessingTx,
    setPendingTxHash,
    setTxStatus,
    setManualCheckEnabled,
    addToQueue,
    completeTransaction,
  };
}
