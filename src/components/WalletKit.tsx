import { useEffect, useState } from 'react';
import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { useIsLoggedIn, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { createPublicClient, http, encodeFunctionData, type Hash } from 'viem';
import { sepolia } from 'viem/chains';
import { OptimismPortalABI } from '../abi/OptimismPortal';
import { isEthereumWallet } from '@dynamic-labs/ethereum';
import { ExternalLink, CheckCircle2, XCircle, Loader2, RotateCw } from 'lucide-react';
import { TransactionTable } from '../components/TransactionTable';
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Steps } from "./Steps";

// Constants
const PORTAL_ADDRESS = '0x0d83dab629f0e0F9d36c0Cbc89B69a489f0751bD'; // Unichain Portal
// const PORTAL_ADDRESS = '0x16Fc5058F25648194471939df75CF27A2fdC48BC';

// At the top of the file, after imports
const WALLETKIT_STORAGE_KEY = 'walletkit_session';

interface SessionRequestParams {
  method: string;
  params: any[];
}

// Export interfaces for TransactionTable
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
  hash: string;
  timestamp: number;
  to: string;
  value: string;
}

let walletKit: WalletKit;

export function WalletKitComponent() {
  const [wcUri, setWcUri] = useState('');
  const [status, setStatus] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [queuedTransactions, setQueuedTransactions] = useState<QueuedTransaction[]>([]);
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [completedTransactions, setCompletedTransactions] = useState<CompletedTransaction[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  
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

  // Create L1 client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http()
  });

  const checkL1Connection = async () => {
    try {
      if (!primaryWallet?.address) {
        setStatus('L1 not connected');
        return false;
      }
      // Try to get the balance as a connection test
      await publicClient.getBalance({ address: primaryWallet.address as `0x${string}` });
      setStatus('L1 connection verified');
      return true;
    } catch (error) {
      console.error('L1 connection error:', error);
      setStatus('L1 connection failed');
      await handleLogOut();
      return false;
    }
  };

  const checkL2Connection = async () => {
    try {
      if (!walletKit || !isConnected) {
        setStatus('L2 not connected');
        return false;
      }
      
      // Check if we have any active sessions
      const sessions = walletKit.getActiveSessions();
      if (Object.keys(sessions).length === 0) {
        setStatus('No active L2 sessions');
        setIsConnected(false);
        return false;
      }
      
      setStatus('L2 connection verified');
      return true;
    } catch (error) {
      console.error('L2 connection error:', error);
      setStatus('L2 connection failed');
      setIsConnected(false);
      return false;
    }
  };

  const resetConnections = async () => {
    try {
      // Reset L2 first
      if (walletKit) {
        const sessions = walletKit.getActiveSessions();
        for (const topic of Object.keys(sessions)) {
          await walletKit.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') });
        }
      }
      setIsConnected(false);
      setQueuedTransactions([]);
      
      // Reset L1
      await handleLogOut();
      
      setStatus('All connections reset');
    } catch (error) {
      console.error('Reset error:', error);
      setStatus('Reset failed');
    }
  };

  // Add new state for transaction status
  const [processingTx, setProcessingTx] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<string>('');

  // Add new state for transaction hash
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  // Add new state for manual checking
  const [manualCheckEnabled, setManualCheckEnabled] = useState(false);

  // Add new state for completed transactions
  const [completedTxs, setCompletedTxs] = useState<number[]>([]);

  // Add function to handle transaction cancellation
  const handleCancelTransaction = async (tx: QueuedTransaction) => {
    try {
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

  // Modify the checkTransactionStatus function to handle completion
  const checkTransactionStatus = async (hash: string, tx: QueuedTransaction) => {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
      if (receipt) {
        setTxStatus('Transaction confirmed!');
        // Add to completed transactions with more details
        const completedTx: CompletedTransaction = {
          id: tx.id,
          hash,
          timestamp: Date.now(),
          to: tx.params.to,
          value: tx.params.value?.toString() || '0',
        };
        setCompletedTransactions(prev => [completedTx, ...prev].slice(0, 10)); // Keep last 10
        setCompletedTxs(prev => [...prev, tx.id]);
        
        setTimeout(() => {
          setQueuedTransactions(prev => prev.filter(t => t.id !== tx.id));
          setProcessingTx(null);
          setTxStatus('');
          setPendingTxHash(null);
          setManualCheckEnabled(false);
        }, 3000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking transaction:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !primaryWallet?.address) return;

    const initWalletKit = async () => {
      try {
        // Clean up any existing instance
        if (walletKit) {
          const sessions = walletKit.getActiveSessions();
          for (const topic of Object.keys(sessions)) {
            await walletKit.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') });
          }
        }

        const core = new Core({
          projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
          relayUrl: 'wss://relay.walletconnect.org'
        });

        // Initialize WalletKit
        walletKit = await WalletKit.init({
          core,
          metadata: {
            name: 'ethglobal-devcon',
            description: 'WalletKit Integration Demo',
            url: window.location.origin,
            icons: [`${window.location.origin}/icon.png`]
          },
          // Add persistence options
          persistent: true,
          storageKey: WALLETKIT_STORAGE_KEY
        });

        // Try to restore previous session
        const savedSessions = walletKit.getActiveSessions();
        if (Object.keys(savedSessions).length > 0) {
          setIsConnected(true);
          setStatus('Previous session restored');
        }

        // Handle disconnection
        walletKit.on('session_delete', () => {
          console.log('Session deleted');
          setIsConnected(false);
          setQueuedTransactions([]);
        });

        // Handle session expiry
        walletKit.on('session_expire', ({ topic }) => {
          console.log('Session expired:', topic);
          setIsConnected(false);
          setQueuedTransactions([]);
        });

        walletKit.on('session_proposal', async ({ id, params }) => {
          try {
            console.log('Received session proposal:', { id, params });
            
            const approvedNamespaces = buildApprovedNamespaces({
              proposal: params,
              supportedNamespaces: {
                eip155: {
                  chains: ['eip155:1301'],
                  methods: [
                    'eth_sendTransaction',
                    'personal_sign',
                    'eth_signTransaction',
                    'eth_sign',
                    'eth_signTypedData',
                    'eth_signTypedData_v4'
                  ],
                  events: ['chainChanged', 'accountsChanged'],
                  accounts: [
                    `eip155:1301:${primaryWallet.address}`
                  ]
                }
              }
            });

            console.log('Approving session with namespaces:', approvedNamespaces);

            await walletKit.approveSession({
              id,
              namespaces: approvedNamespaces
            });
            
            setIsConnected(true);
            setStatus('Connected to L2 dApp');
          } catch (error) {
            console.error('Session approval error:', error);
            await walletKit.rejectSession({
              id,
              reason: getSdkError('USER_REJECTED')
            });
            setStatus('Session rejected');
          }
        });

        walletKit.on('session_request', async ({ topic, params, id }) => {
          try {
            console.log('Raw session request:', { topic, params, id });

            // Properly extract method and parameters from the request
            const method = params?.request?.method;
            const requestParams = params?.request?.params;

            console.log('Parsed request:', { method, requestParams });

            // Verify session is still active
            const sessions = walletKit.getActiveSessions();
            if (!sessions[topic]) {
              console.error('Session not found for topic:', topic);
              setIsConnected(false);
              throw new Error('Invalid session');
            }

            if (method === 'eth_sendTransaction') {
              // Log full transaction details
              console.log('Incoming L2 Transaction:', {
                method,
                requestId: id,
                topic,
                transaction: {
                  ...requestParams[0],
                  value: requestParams[0].value ? requestParams[0].value.toString() : '0',
                  gas: requestParams[0].gas ? requestParams[0].gas.toString() : '0',
                  gasPrice: requestParams[0].gasPrice ? requestParams[0].gasPrice.toString() : '0',
                },
                timestamp: new Date().toISOString()
              });

              const newTransaction: QueuedTransaction = {
                id: Date.now(),
                params: requestParams[0],
                topic,
                requestId: id
              };
              setQueuedTransactions(prev => [...prev, newTransaction]);
              setStatus('Transaction queued');
            } else if (method === 'personal_sign' || method === 'eth_sign') {
              console.log('Incoming Sign Request:', {
                method,
                params: requestParams,
                requestId: id,
                topic,
                timestamp: new Date().toISOString()
              });

              // For signing requests, handle differently based on method
              let signature;
              if (method === 'personal_sign') {
                signature = await primaryWallet.signMessage(requestParams[1]); // For personal_sign, message is the second parameter
              } else if (method === 'eth_sign') {
                signature = await primaryWallet.signMessage(requestParams[1]); // For eth_sign, message is the second parameter
              }

              await walletKit.respondSessionRequest({
                topic,
                response: signature
              });
              setStatus('Request approved');
            } else {
              console.warn('Unsupported method:', method);
              throw new Error(`Unsupported method: ${method}`);
            }
          } catch (error) {
            console.error('Session request error:', error);
            
            // If session is invalid, clean up the local state
            if (error instanceof Error && error.message === 'Invalid session') {
              setIsConnected(false);
              setQueuedTransactions([]);
            }

            try {
              await walletKit.reject({
                id,
                reason: getSdkError('USER_REJECTED')
              });
            } catch (rejectError) {
              console.error('Error rejecting request:', rejectError);
            }
            
            setStatus('Request rejected');
          }
        });
      } catch (error) {
        console.error('WalletKit initialization error:', error);
        setStatus('Failed to initialize WalletKit');
      }
    };

    initWalletKit();

    // Cleanup function
    return () => {
      if (walletKit) {
        // Don't disconnect sessions on cleanup, just clear the reference
        walletKit = undefined;
      }
    };
  }, [isLoggedIn, primaryWallet?.address]);

  // Add a function to check session validity before transactions
  const ensureValidSession = async () => {
    if (!walletKit) return false;
    
    const sessions = walletKit.getActiveSessions();
    if (Object.keys(sessions).length === 0) {
      setIsConnected(false);
      setStatus('Session expired, please reconnect');
      return false;
    }
    return true;
  };

  const handleConnect = async () => {
    if (!wcUri) {
      setStatus('Please enter a WalletConnect URI');
      return;
    }

    try {
      await walletKit.pair({ uri: wcUri });
      setWcUri('');
    } catch (error) {
      console.error('Pairing error:', error);
      setStatus('Pairing failed');
    }
  };

  // Modify handleL2Transaction to check session validity
  const handleL2Transaction = async (transaction: QueuedTransaction): Promise<Hash> => {
    if (!primaryWallet?.address) throw new Error('No wallet connected');
    if (!primaryWallet || !isEthereumWallet(primaryWallet)) throw new Error('No wallet connected');
    
    // Check session validity before proceeding
    if (!(await ensureValidSession())) {
      throw new Error('Invalid session');
    }

    setProcessingTx(transaction.id);
    setTxStatus('Preparing transaction...');
    setPendingTxHash(null);

    try {
      // Extract transaction parameters
      const {
        to,
        data,
        value: originalValue = 0n,
        gas: gasLimit = 100000n
      } = transaction.params;

      setTxStatus('Estimating gas...');
      
      // Estimate gas on L1 for the deposit
      const gasEstimate = await publicClient.estimateContractGas({
        address: PORTAL_ADDRESS,
        abi: OptimismPortalABI,
        functionName: 'depositTransaction',
        args: [
          to,
          BigInt(originalValue || 0),
          BigInt(gasLimit),
          false,
          data || '0x',
        ],
        account: primaryWallet.address as `0x${string}`,
      });

      // Get current gas price
      const gasPrice = await publicClient.getGasPrice();

      // Calculate required gas cost with 1.5x buffer
      const gasCost = (gasEstimate * gasPrice * 15n) / 10n;

      // Total value is original transaction value plus gas cost
      const totalValue = BigInt(originalValue || 0) + gasCost;

      console.log('Transaction details:', {
        originalValue: originalValue.toString(),
        gasCost: gasCost.toString(),
        totalValue: totalValue.toString(),
        to: PORTAL_ADDRESS,
        from: primaryWallet.address,
      });

      setTxStatus('Preparing L1 transaction...');

      // Prepare transaction data
      const txData = encodeFunctionData({
        abi: OptimismPortalABI,
        functionName: 'depositTransaction',
        args: [
          to,
          BigInt(originalValue || 0),
          BigInt(gasLimit),
          false,
          data || '0x',
        ],
      });

      const walletClient = await primaryWallet.getWalletClient();

      setTxStatus('Please sign the transaction in your wallet...');
      
      // Add timeout for signature waiting
      const hash = await Promise.race([
        walletClient.sendTransaction({
          from: primaryWallet.address,
          to: PORTAL_ADDRESS,
          value: totalValue,
          data: txData,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Wallet signature timeout')), 30000)
        )
      ]) as Hash;

      setPendingTxHash(hash);
      setTxStatus('Transaction submitted! Waiting for confirmation...');
      setManualCheckEnabled(true);  // Enable manual checking

      // Initial check after 5 seconds
      setTimeout(async () => {
        const confirmed = await checkTransactionStatus(hash, transaction);
        if (!confirmed) {
          setTxStatus('Transaction pending. You can check status manually.');
        }
      }, 5000);

      return hash;
    } catch (error) {
      if (error.message === 'Wallet signature timeout') {
        setTxStatus('Wallet signature taking longer than expected. Please check your wallet.');
        // Enable manual check in case transaction was actually submitted
        setManualCheckEnabled(true);
      } else {
        console.error('Error submitting L1 transaction:', error);
        setTxStatus(error instanceof Error ? error.message : 'Transaction failed');
        
        // Clear processing state after error
        setTimeout(() => {
          setProcessingTx(null);
          setTxStatus('');
          setPendingTxHash(null);
          setManualCheckEnabled(false);
        }, 3000);
      }
      
      throw error;
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

      {/* Connection Status - Always visible when logged in */}
      {isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Connection Status
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={isLoggedIn ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}>
                    L1
                  </Badge>
                  {isLoggedIn ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={isConnected ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}>
                    L2
                  </Badge>
                  {isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

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
      {!isConnected && (
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

      {/* Debug Section - At the bottom */}
      {isLoggedIn && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Debug</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Debug Actions */}
            <div className="flex gap-2">
              <Button onClick={checkL1Connection}>Check L1</Button>
              <Button onClick={checkL2Connection}>Check L2</Button>
              <Button variant="outline" onClick={resetConnections}>Reset</Button>
            </div>

            {/* Status Message */}
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