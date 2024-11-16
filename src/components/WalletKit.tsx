import { useEffect, useState } from 'react';
import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { useIsLoggedIn, useDynamicContext } from '@dynamic-labs/sdk-react-core';

let walletKit: WalletKit;

export function WalletKitComponent() {
  const [wcUri, setWcUri] = useState('');
  const [status, setStatus] = useState('');
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  useEffect(() => {
    if (!isLoggedIn || !primaryWallet?.address) return;

    const initWalletKit = async () => {
      const core = new Core({
        projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID
      });

      walletKit = await WalletKit.init({
        core,
        metadata: {
          name: 'ethglobal-devcon',
          description: 'WalletKit Integration Demo',
          url: 'https://yourapp.com',
          icons: ['https://yourapp.com/icon.png']
        }
      });

      walletKit.on('session_proposal', async ({ id, params }) => {
        try {
          const approvedNamespaces = buildApprovedNamespaces({
            proposal: params,
            supportedNamespaces: {
              eip155: {
                chains: ['eip155:1301'], // Unichain Sepolia
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
                //   `eip155:1:${primaryWallet.address}`,
                //   `eip155:11155420:${primaryWallet.address}`, // Optimism Sepolia
                  `eip155:1301:${primaryWallet.address}` // Unichain Sepolia
                ]
              }
            }
          });

          await walletKit.approveSession({
            id,
            namespaces: approvedNamespaces
          });
          
          setStatus('Session approved');
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
          // Here you would typically show a UI to the user to approve/reject the request
          // For now, we'll auto-approve
          const response = await primaryWallet.connector.signMessage(params);
          await walletKit.respondSessionRequest({
            topic,
            response
          });
          setStatus('Request approved');
        } catch (error) {
          console.error('Session request error:', error);
          await walletKit.rejectSessionRequest({
            topic,
            id,
            reason: getSdkError('USER_REJECTED')
          });
          setStatus('Request rejected');
        }
      });
    };

    initWalletKit();
  }, [isLoggedIn, primaryWallet?.address]);

  const handleConnect = async () => {
    if (!wcUri) {
      setStatus('Please enter a WalletConnect URI');
      return;
    }

    try {
      await walletKit.pair({ uri: wcUri });
      setStatus('Pairing successful');
      setWcUri('');
    } catch (error) {
      console.error('Pairing error:', error);
      setStatus('Pairing failed');
    }
  };

  if (!isLoggedIn || !primaryWallet?.address) {
    return null;
  }

  return (
    <div>
      <h3>WalletKit Connection</h3>
      <input
        type="text"
        value={wcUri}
        onChange={(e) => setWcUri(e.target.value)}
        placeholder="Enter WalletConnect URI"
        style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
      />
      <button onClick={handleConnect}>Connect</button>
      {status && <p>{status}</p>}
    </div>
  );
}