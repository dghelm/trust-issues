import { useState, useEffect } from 'react';
import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { type Hash } from 'viem';
import { type QueuedTransaction } from '../types';
import { L2_NETWORKS } from '../config/networks';

interface UseWalletKitProps {
  isLoggedIn: boolean;
  walletAddress?: string;
  onStatusChange: (status: string) => void;
  onConnectionChange: (connected: boolean) => void;
  onTransactionQueued: (transaction: QueuedTransaction) => void;
}

export function useWalletKit({
  isLoggedIn,
  walletAddress,
  onStatusChange,
  onConnectionChange,
  onTransactionQueued,
}: UseWalletKitProps) {
  const [walletKit, setWalletKit] = useState<typeof WalletKit | null>(null);

  const setupEventListeners = (kit: typeof WalletKit) => {
    kit.on('session_delete', () => {
      console.log('Session deleted');
      onConnectionChange(false);
    });

    kit.on('session_expire', ({ topic }: { topic: string }) => {
      console.log('Session expired:', topic);
      onConnectionChange(false);
    });

    kit.on('session_proposal', async (event: { id: number; params: any }) => {
      try {
        console.log('Received session proposal:', event);

        if (!walletAddress) {
          throw new Error('No wallet address available');
        }

        const chains = Object.values(L2_NETWORKS).map(
          (network) => `eip155:${network.chainId}`
        );
        const accounts = Object.values(L2_NETWORKS).map(
          (network) => `eip155:${network.chainId}:${walletAddress}`
        );

        const approvedNamespaces = buildApprovedNamespaces({
          proposal: event.params,
          supportedNamespaces: {
            eip155: {
              chains,
              methods: [
                'eth_sendTransaction',
                'personal_sign',
                'eth_signTransaction',
                'eth_sign',
                'eth_signTypedData',
                'eth_signTypedData_v4',
              ],
              events: ['chainChanged', 'accountsChanged'],
              accounts,
            },
          },
        });

        console.log('Approving session with namespaces:', approvedNamespaces);

        await kit.approveSession({
          id: event.id,
          namespaces: approvedNamespaces,
        });

        onConnectionChange(true);
        onStatusChange('Connected to L2 dApp');
      } catch (error) {
        console.error('Session approval error:', error);
        await kit.rejectSession({
          id: event.id,
          reason: getSdkError('USER_REJECTED'),
        });
        onStatusChange('Session rejected');
      }
    });

    kit.on('session_request', async ({ topic, params, id }) => {
      try {
        console.log('Raw session request:', { topic, params, id });

        const method = params?.request?.method;
        const requestParams = params?.request?.params;

        console.log('Parsed request:', { method, requestParams });

        if (method === 'eth_sendTransaction' && requestParams?.[0]) {
          const newTransaction: QueuedTransaction = {
            id: Date.now(),
            params: requestParams[0],
            topic,
            requestId: id,
          };
          onTransactionQueued(newTransaction);
          onStatusChange('Transaction queued');
        }
      } catch (error) {
        console.error('Session request error:', error);
        await kit.rejectSession({
          id,
          reason: getSdkError('USER_REJECTED'),
        });
        onStatusChange('Request rejected');
      }
    });
  };

  useEffect(() => {
    if (!isLoggedIn || !walletAddress) return;

    const initWalletKit = async () => {
      try {
        // Clean up any existing instance
        if (walletKit) {
          const sessions = walletKit.getActiveSessions();
          for (const topic of Object.keys(sessions)) {
            await walletKit.disconnectSession({
              topic,
              reason: getSdkError('USER_DISCONNECTED'),
            });
          }
        }

        const core = new Core({
          projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
          relayUrl: 'wss://relay.walletconnect.org',
        });

        const newWalletKit = await WalletKit.init({
          core,
          metadata: {
            name: 'ethglobal-devcon',
            description: 'WalletKit Integration Demo',
            url: window.location.origin,
            icons: [`${window.location.origin}/icon.png`],
          },
        });

        setWalletKit(newWalletKit);
        setupEventListeners(newWalletKit);
        onConnectionChange(false);
      } catch (error) {
        console.error('WalletKit initialization error:', error);
        onStatusChange('Failed to initialize WalletKit');
        onConnectionChange(false);
      }
    };

    initWalletKit();

    return () => {
      if (walletKit) {
        try {
          const sessions = walletKit.getActiveSessions();
          for (const topic of Object.keys(sessions)) {
            walletKit.disconnectSession({
              topic,
              reason: getSdkError('USER_DISCONNECTED'),
            });
          }
        } catch (e) {
          console.error('Cleanup error:', e);
        }
        setWalletKit(null);
      }
      onConnectionChange(false);
    };
  }, [isLoggedIn, walletAddress]);

  const pair = async (uri: string) => {
    if (!walletKit) throw new Error('WalletKit not initialized');
    await walletKit.pair({ uri });
  };

  const checkSession = async () => {
    if (!walletKit) return false;
    const sessions = walletKit.getActiveSessions();
    return Object.keys(sessions).length > 0;
  };

  return {
    walletKit,
    pair,
    checkSession,
  };
}
