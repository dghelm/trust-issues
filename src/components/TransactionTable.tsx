import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Trash2, Loader2, RotateCw, CheckCircle } from 'lucide-react';
import { type CompletedTransaction, type QueuedTransaction } from './WalletKit';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { L2_NETWORKS } from '../config/networks';

interface TransactionTableProps {
  transactions: (QueuedTransaction | CompletedTransaction)[];
  type: 'queued' | 'completed';
  onSubmit?: (tx: QueuedTransaction) => Promise<void>;
  onCancel?: (tx: QueuedTransaction) => Promise<void>;
  onCheck?: (hash: string, tx: QueuedTransaction) => Promise<void>;
  processingTx?: number | null;
  pendingTxHash?: string | null;
  manualCheckEnabled?: boolean;
  network: string;
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
  network,
}: TransactionTableProps) {
  const networkConfig = L2_NETWORKS[network];

  const isProcessing = (tx: QueuedTransaction) => processingTx === tx.id;

  const renderActions = (transaction: QueuedTransaction | CompletedTransaction) => {
    if (type === 'completed') {
      const tx = transaction as CompletedTransaction;
      return (
        <div className="flex items-center justify-end gap-2">
          <a
            href={`${networkConfig.l1BlockExplorer}/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            L1 <ExternalLink className="w-4 h-4 inline" />
          </a>
          <a
            href={`${networkConfig.blockExplorer}/tx/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            L2 <ExternalLink className="w-4 h-4 inline" />
          </a>
          <CheckCircle className="w-4 h-4 text-green-500" />
        </div>
      );
    }

    const queuedTx = transaction as QueuedTransaction;
    const isProcessingTx = isProcessing(queuedTx);

    return (
      <div className="flex items-center gap-2">
        {isProcessingTx ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel?.(queuedTx)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            {pendingTxHash && manualCheckEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCheck?.(pendingTxHash, queuedTx)}
                className={cn(
                  "gap-2",
                  isProcessingTx && "animate-spin"
                )}
              >
                <RotateCw className="w-4 h-4" />
                Check
              </Button>
            )}
            {pendingTxHash && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={`https://sepolia.etherscan.io/tx/${pendingTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View
                </a>
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => onSubmit?.(queuedTx)}
            className="gap-2"
          >
            Submit
          </Button>
        )}
      </div>
    );
  };

  return (
    <Table>
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
              {type === 'completed' 
                ? `${(tx as CompletedTransaction).to.slice(0, 6)}...${(tx as CompletedTransaction).to.slice(-4)}`
                : `${(tx as QueuedTransaction).params.to.slice(0, 6)}...${(tx as QueuedTransaction).params.to.slice(-4)}`
              }
            </TableCell>
            <TableCell>
              {type === 'completed'
                ? (Number((tx as CompletedTransaction).value) / 1e18).toFixed(4)
                : ((tx as QueuedTransaction).params.value 
                    ? (Number((tx as QueuedTransaction).params.value) / 1e18).toFixed(4) 
                    : '0'
                  )
              }
            </TableCell>
            {type === 'completed' && (
              <TableCell>
                {new Date((tx as CompletedTransaction).timestamp).toLocaleString()}
              </TableCell>
            )}
            <TableCell className="text-right">
              {renderActions(tx)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 