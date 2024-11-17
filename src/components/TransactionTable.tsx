import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, CheckCircle2, XCircle, Loader2, RotateCw } from 'lucide-react';
import { type CompletedTransaction, type QueuedTransaction } from './WalletKit';
import { Button } from "@/components/ui/button";

interface TransactionTableProps {
  transactions: (QueuedTransaction | CompletedTransaction)[];
  type: 'queued' | 'completed';
  onSubmit?: (tx: QueuedTransaction) => Promise<void>;
  onCancel?: (tx: QueuedTransaction) => Promise<void>;
  onCheck?: (hash: string, tx: QueuedTransaction) => Promise<void>;
  processingTx?: number | null;
  pendingTxHash?: string | null;
  manualCheckEnabled?: boolean;
}

export function TransactionTable({
  transactions,
  type,
  onSubmit,
  onCancel,
  onCheck,
  processingTx,
  pendingTxHash,
  manualCheckEnabled,
}: TransactionTableProps) {
  const isProcessing = (tx: QueuedTransaction) => processingTx === tx.id;

  const renderActions = (transaction: QueuedTransaction) => {
    const isProcessingTx = isProcessing(transaction);

    return (
      <div className="flex items-center gap-2">
        {type === 'queued' ? (
          <>
            {isProcessingTx && (
              <button
                onClick={() => onCancel?.(transaction)}
                className="flex items-center gap-1 text-red-500 hover:text-red-600"
              >
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Cancel</span>
              </button>
            )}
            {pendingTxHash && manualCheckEnabled && isProcessingTx && (
              <button
                onClick={() => onCheck?.(pendingTxHash, transaction)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Check transaction status"
              >
                <RotateCw className="w-4 h-4 text-blue-500" />
              </button>
            )}
            {pendingTxHash && isProcessingTx && (
              <a
                href={`https://sepolia.etherscan.io/tx/${pendingTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            )}
          </>
        ) : (
          <a
            href={`https://eth-sepolia.blockscout.com/tx/${(transaction as CompletedTransaction).hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-end gap-1 text-blue-500 hover:text-blue-600"
          >
            <span className="text-sm">View</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  };

  return (
    <Table>
      <TableCaption>
        {type === 'queued' ? 'Queued Transactions' : 'Recent Transactions'}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>To</TableHead>
          <TableHead>Value (ETH)</TableHead>
          {type === 'completed' && <TableHead>Time</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="font-mono">
              {tx.params.to.slice(0, 6)}...{tx.params.to.slice(-4)}
            </TableCell>
            <TableCell>
              {tx.params.value ? (Number(tx.params.value) / 1e18).toFixed(4) : '0'}
            </TableCell>
            {type === 'completed' && (
              <TableCell>
                {new Date((tx as CompletedTransaction).timestamp).toLocaleString()}
              </TableCell>
            )}
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                {type === 'queued' && !isProcessing(tx as QueuedTransaction) && (
                  <Button
                    size="sm"
                    onClick={() => onSubmit?.(tx)}
                    className="flex items-center gap-1"
                  >
                    Submit
                  </Button>
                )}
                {renderActions(tx as QueuedTransaction)}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 