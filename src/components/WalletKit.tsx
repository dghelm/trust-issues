import { useEffect, useState, useMemo } from 'react';
import { useIsLoggedIn, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useWalletKit } from '../hooks/useWalletKit';
import { useTransactionQueue } from '../hooks/useTransactionQueue';
import { TransactionService } from '../services/transactionService';
import { ExternalLink, CheckCircle2, XCircle, Loader2, RotateCw } from 'lucide-react';
import { TransactionTable } from '../components/TransactionTable';
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Steps } from "./Steps";
import type { QueuedTransaction } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { L2_NETWORKS, DEFAULT_NETWORK } from '../config/networks';

export function WalletKitComponent() {
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [status, setStatus] = useState('');
  const [wcUri, setWcUri] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(DEFAULT_NETWORK);

  const transactionService = useMemo(() => new TransactionService(L2_NETWORKS[selectedNetwork]), [selectedNetwork]);
  const {
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
  } = useTransactionQueue();

  const {
    walletKit,
    pair,
    checkSession
  } = useWalletKit({
    isLoggedIn,
    walletAddress: primaryWallet?.address,
    onStatusChange: setStatus,
    onConnectionChange: setIsConnected,
    onTransactionQueued: addToQueue
  });

  // Calculate current step based on state
  useEffect(() => {
    if (!isLoggedIn || !primaryWallet?.address) {
      setCurrentStep(1);
    } else if (!isConnected) {
      setCurrentStep(2);
    } else if (queuedTransactions.length === 0) {
      setCurrentStep(3);
    } else {
      setCurrentStep(4);
    }
  }, [isLoggedIn, primaryWallet?.address, isConnected, queuedTransactions.length]);

  const handleConnect = async () => {
    if (!wcUri) {
      setStatus('Please enter a WalletConnect URI');
      return;
    }

    try {
      await pair(wcUri);
      setWcUri('');
    } catch (error) {
      console.error('Pairing error:', error);
      setStatus('Pairing failed');
    }
  };

  const handleL2Transaction = async (transaction: QueuedTransaction) => {
    if (!primaryWallet?.address) throw new Error('No wallet connected');
    if (!walletKit) throw new Error('WalletKit not initialized');
    
    setProcessingTx(transaction.id);
    setTxStatus('Preparing transaction...');
    setPendingTxHash(null);

    try {
      const {
        to,
        data,
        value: originalValue = '0',
        gas: gasLimit = '100000'
      } = transaction.params;

      setTxStatus('Estimating gas...');
      
      // Estimate gas on L1 for the deposit
      const gasEstimate = await transactionService.estimateGas({
        to,
        value: BigInt(originalValue),
        gasLimit: BigInt(gasLimit),
        data: data || '0x',
        account: primaryWallet.address
      });

      // Get current gas price
      const gasPrice = await transactionService.getGasPrice();

      // Calculate required gas cost with 1.5x buffer
      const gasCost = (gasEstimate * gasPrice * 15n) / 10n;

      // Total value is original transaction value plus gas cost
      const totalValue = BigInt(originalValue) + gasCost;

      console.log('Transaction details:', {
        originalValue,
        gasCost: gasCost.toString(),
        totalValue: totalValue.toString(),
        to,
        from: primaryWallet.address,
      });

      setTxStatus('Preparing L1 transaction...');

      const walletClient = await primaryWallet.getWalletClient();
      
      setTxStatus('Please sign the transaction in your wallet...');
      
      let hash;
      try {
        hash = await Promise.race([
          walletClient.sendTransaction({
            from: primaryWallet.address,
            to,
            value: totalValue,
            data: data || '0x',
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Wallet signature timeout')), 30000)
          )
        ]) as `0x${string}`;
      } catch (error: any) {
        if (error.message === 'Wallet signature timeout') {
          setTxStatus('Checking for transaction...');
          const currentBlock = await transactionService.publicClient.getBlockNumber();
          
          const tx = await transactionService.findRecentTransaction({
            fromAddress: primaryWallet.address,
            toAddress: to,
            startBlock: currentBlock
          });
          
          if (tx) {
            hash = tx.hash;
            setTxStatus('Transaction found! Waiting for confirmation...');
          } else {
            setTxStatus('Unable to confirm if transaction was submitted. Please check your wallet.');
            throw error;
          }
        } else {
          throw error;
        }
      }

      setPendingTxHash(hash);
      setTxStatus('Transaction submitted! Waiting for confirmation...');
      setManualCheckEnabled(true);

      // Initial check after 5 seconds
      setTimeout(async () => {
        await checkTransactionStatus(hash, transaction);
      }, 5000);

      return hash;
    } catch (error) {
      console.error('Error submitting L1 transaction:', error);
      setTxStatus(error instanceof Error ? error.message : 'Transaction failed');
      
      setTimeout(() => {
        setProcessingTx(null);
        setTxStatus('');
        setPendingTxHash(null);
        setManualCheckEnabled(false);
      }, 3000);
      
      throw error;
    }
  };

  const handleCancelTransaction = async (tx: QueuedTransaction) => {
    try {
      if (!walletKit) throw new Error('WalletKit not initialized');
      
      await walletKit.rejectSessionRequest({
        topic: tx.topic,
        id: tx.requestId,
        reason: getSdkError('USER_REJECTED')
      });
      
      setQueuedTransactions(prev => prev.filter(t => t.id !== tx.id));
      setProcessingTx(null);
      setTxStatus('');
      setPendingTxHash(null);
      setManualCheckEnabled(false);
      setStatus('Transaction cancelled');
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      // Even if rejection fails, we should clean up the UI
      setQueuedTransactions(prev => prev.filter(t => t.id !== tx.id));
      setProcessingTx(null);
      setTxStatus('');
      setPendingTxHash(null);
      setManualCheckEnabled(false);
      setStatus('Transaction removed');
    }
  };

  const checkTransactionStatus = async (hash: string, tx: QueuedTransaction) => {
    try {
      const receipt = await transactionService.checkTransactionReceipt(hash as `0x${string}`);
      if (receipt) {
        setTxStatus('Transaction confirmed!');
        completeTransaction(tx, hash as `0x${string}`);
        
        // Clean up the queued transaction
        const updatedQueue = queuedTransactions.filter(t => t.id !== tx.id);
        setQueuedTransactions(updatedQueue);
        
        setTimeout(() => {
          setProcessingTx(null);
          setTxStatus('');
          setPendingTxHash(null);
          setManualCheckEnabled(false);
        }, 3000);
        return true;
      }
      setTxStatus('Transaction still pending...');
      return false;
    } catch (error) {
      console.error('Error checking transaction:', error);
      setTxStatus('Error checking transaction status');
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Steps indicator - always visible */}
      <Steps 
        steps={[
          { title: 'Connect L1', description: 'Connect your L1 wallet' },
          { title: 'Connect L2', description: 'Connect to L2 dApp' },
          { title: 'Create Transaction', description: 'Create transaction on L2' },
          { title: 'Review & Submit', description: 'Review and submit transaction' }
        ]}
        currentStep={currentStep}
      />

      {/* Network Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Network Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedNetwork}
            onValueChange={setSelectedNetwork}
          >
            <SelectTrigger className="w-full bg-background text-foreground">
              <SelectValue placeholder="Select L2 Network" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {Object.entries(L2_NETWORKS).map(([key, network]) => (
                <SelectItem 
                  key={key} 
                  value={key}
                  className="text-foreground hover:bg-muted"
                >
                  {network.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Show connection prompt if not logged in */}
      {!isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please connect your L1 wallet using Dynamic to continue.
            </p>
          </CardContent>
        </Card>
      )}

      {/* L2 Connection */}
      {!isConnected && isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle>Connect to L2 dApp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                value={wcUri}
                onChange={(e) => setWcUri(e.target.value)}
                placeholder="Enter WalletConnect URI"
                className="flex-1 bg-background text-foreground placeholder:text-muted-foreground"
              />
              <Button onClick={handleConnect}>Connect</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Queue */}
      {queuedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={queuedTransactions}
              type="queued"
              network={selectedNetwork}
              onSubmit={handleL2Transaction}
              onCancel={handleCancelTransaction}
              onCheck={checkTransactionStatus}
              processingTx={processingTx}
              pendingTxHash={pendingTxHash}
              manualCheckEnabled={manualCheckEnabled}
            />
          </CardContent>
        </Card>
      )}

      {/* Completed Transactions */}
      {completedTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={completedTransactions}
              type="completed"
            />
          </CardContent>
        </Card>
      )}

      {/* Debug Section */}
      {isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle>Debug</CardTitle>
          </CardHeader>
          <CardContent>
            {status && (
              <Alert>
                <AlertDescription>{status}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}