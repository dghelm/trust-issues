import { Core } from '@walletconnect/core';

interface SessionProposal {
  id: number;
  params: {
    id: number;
    proposer: {
      metadata: {
        name: string;
        description: string;
        url: string;
        icons: string[];
      };
    };
    requiredNamespaces: Record<string, any>;
  };
}

interface SessionRequest {
  topic: string;
  params: {
    request: {
      method: string;
      params: any[];
    };
    chainId: string;
  };
  id: number;
}

interface SessionExpire {
  topic: string;
}

export interface WalletKitInstance {
  init: (config: { core: Core; metadata: any }) => Promise<WalletKitInstance>;
  on(
    event: 'session_proposal',
    callback: (data: SessionProposal) => void
  ): void;
  on(event: 'session_request', callback: (data: SessionRequest) => void): void;
  on(event: 'session_expire', callback: (data: SessionExpire) => void): void;
  on(event: 'session_delete', callback: () => void): void;
  pair: (options: { uri: string }) => Promise<void>;
  getActiveSessions: () => Record<string, any>;
  disconnectSession: (options: { topic: string; reason: any }) => Promise<void>;
  approveSession: (options: { id: number; namespaces: any }) => Promise<void>;
  rejectSession: (options: { id: number; reason: any }) => Promise<void>;
  respondSessionRequest: (options: {
    topic: string;
    response: any;
  }) => Promise<void>;
  rejectSessionRequest: (options: {
    topic: string;
    id: number;
    reason: any;
  }) => Promise<void>;
}

export type WalletKitType = {
  init: (config: { core: Core; metadata: any }) => Promise<WalletKitInstance>;
};

declare let walletKit: WalletKitType;
export { walletKit as WalletKit };
