export interface L2Network {
  name: string;
  chainId: number;
  portalAddress: string;
  rpcUrl: string;
  blockExplorer: string;
  l1BlockExplorer: string;
}

export const L2_NETWORKS: Record<string, L2Network> = {
  unichain: {
    name: 'Unichain Sepolia',
    chainId: 1301,
    portalAddress: '0x0d83dab629f0e0F9d36c0Cbc89B69a489f0751bD',
    rpcUrl: 'https://sepolia.unichain.org',
    blockExplorer: 'https://sepolia.uniscan.xyz',
    l1BlockExplorer: 'https://eth-sepolia.blockscout.com/',
  },
  mantle: {
    name: 'Mantle Sepolia',
    chainId: 5003,
    portalAddress: '0xB3db4bd5bc225930eD674494F9A4F6a11B8EFBc8',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    blockExplorer: 'https://sepolia.mantlescan.xyz',
    l1BlockExplorer: 'https://eth-sepolia.blockscout.com/',
  },
  zircuit: {
    name: 'Zircuit Sepolia',
    chainId: 58008, // Note: Please verify this chainId
    portalAddress: '0x787f1C8c5924178689E0560a43D848bF8E54b23e',
    rpcUrl: 'https://sepolia-testnet.zircuit.com', // Note: Please verify this RPC URL
    blockExplorer: 'https://sepolia.zircuitscan.xyz', // Note: Please verify this explorer URL
    l1BlockExplorer: 'https://eth-sepolia.blockscout.com/',
  },
};

export const DEFAULT_NETWORK = 'unichain';
