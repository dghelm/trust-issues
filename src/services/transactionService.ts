import { type Hash, createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { OptimismPortalABI } from '../abi/OptimismPortal';
import type { L2Network } from '../config/networks';

export class TransactionService {
  public readonly publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  constructor(private network: L2Network) {}

  async estimateGas(params: {
    to: string;
    value: bigint;
    gasLimit: bigint;
    data: string;
    account: string;
  }) {
    return this.publicClient.estimateContractGas({
      address: this.network.portalAddress as `0x${string}`,
      abi: OptimismPortalABI,
      functionName: 'depositTransaction',
      args: [
        params.to as `0x${string}`,
        params.value,
        params.gasLimit,
        false,
        params.data as `0x${string}`,
      ],
      account: params.account as `0x${string}`,
    });
  }

  async getGasPrice() {
    return this.publicClient.getGasPrice();
  }

  async checkTransactionReceipt(hash: Hash) {
    return this.publicClient.getTransactionReceipt({ hash });
  }

  async findRecentTransaction(params: {
    fromAddress: string;
    toAddress: string;
    startBlock: bigint;
  }) {
    const block = await this.publicClient.getBlock({
      blockTag: 'latest',
    });

    for (let i = 0; i < 3; i++) {
      const blockData = await this.publicClient.getBlock({
        blockNumber: block.number - BigInt(i),
        includeTransactions: true,
      });

      const tx = blockData.transactions.find(
        (tx) =>
          tx.from.toLowerCase() === params.fromAddress.toLowerCase() &&
          tx.to?.toLowerCase() === params.toAddress.toLowerCase()
      );

      if (tx) return tx;
    }

    return null;
  }
}
