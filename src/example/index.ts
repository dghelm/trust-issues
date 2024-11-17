import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  encodeFunctionData,
  decodeEventLog,
} from 'viem';
import { sepolia, optimismSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import chalk from 'chalk';
import { CounterABI } from './abi/Counter.js';
import { OptimismPortalABI } from './abi/OptimismPortal.js';

// Constants
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const PORTAL_ADDRESS = '0x16Fc5058F25648194471939df75CF27A2fdC48BC';
const COUNTER_ADDRESS = '0xF5d2E7a52D88E1f4Ed7E81F5CAba4Faf1c542BFd';

// RPC URLs
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL!;
const OPTIMISM_SEPOLIA_RPC_URL = process.env.OPTIMISM_SEPOLIA_RPC_URL!;

// Create wallet client for Sepolia
const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(SEPOLIA_RPC_URL),
});

// Create Sepolia client
const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC_URL),
});

// Create Optimism Sepolia client
const optimismSepoliaClient = createPublicClient({
  chain: optimismSepolia,
  transport: http(OPTIMISM_SEPOLIA_RPC_URL),
});

async function getNetworkBlocks() {
  try {
    // Get block numbers in parallel
    const [sepoliaBlock, optimismSepoliaBlock] = await Promise.all([
      sepoliaClient.getBlockNumber(),
      optimismSepoliaClient.getBlockNumber(),
    ]);

    // Log results with chalk formatting
    console.log(chalk.blue.bold('\n=== Network Block Numbers ===\n'));
    console.log(chalk.cyan('Sepolia:'), chalk.green(sepoliaBlock.toString()));
    console.log(
      chalk.magenta('Optimism Sepolia:'),
      chalk.green(optimismSepoliaBlock.toString())
    );
    console.log(chalk.blue.bold('\n==========================\n'));
  } catch (error) {
    console.error(chalk.red('Error fetching block numbers:'), error);
  }
}

async function getContractState() {
  try {
    const [number, block, origin, sender] = await Promise.all([
      optimismSepoliaClient.readContract({
        address: COUNTER_ADDRESS,
        abi: CounterABI,
        functionName: 'getNumber',
      }),
      optimismSepoliaClient.readContract({
        address: COUNTER_ADDRESS,
        abi: CounterABI,
        functionName: 'getBlock',
      }),
      optimismSepoliaClient.readContract({
        address: COUNTER_ADDRESS,
        abi: CounterABI,
        functionName: 'getOrigin',
      }),
      optimismSepoliaClient.readContract({
        address: COUNTER_ADDRESS,
        abi: CounterABI,
        functionName: 'getSender',
      }),
    ]);

    console.log(chalk.yellow.bold('\n=== Counter Contract State ===\n'));
    console.log(chalk.cyan('Number:'), chalk.green(number.toString()));
    console.log(chalk.cyan('Block:'), chalk.green(block.toString()));
    console.log(chalk.cyan('Origin:'), chalk.green(origin));
    console.log(chalk.cyan('Sender:'), chalk.green(sender));
    console.log(chalk.yellow.bold('\n===========================\n'));
  } catch (error) {
    console.error(chalk.red('Error fetching contract state:'), error);
  }
}

async function depositToOptimism(value: bigint) {
  try {
    // Encode the registerCall function data
    const callData = encodeFunctionData({
      abi: CounterABI,
      functionName: 'registerCall',
      args: [value],
    });

    // Estimate gas on Optimism Sepolia
    const gasEstimate = await optimismSepoliaClient.estimateContractGas({
      address: COUNTER_ADDRESS,
      abi: CounterABI,
      functionName: 'registerCall',
      args: [value],
      account: account.address,
    });

    // Get current gas price on Optimism Sepolia
    const gasPrice = await optimismSepoliaClient.getGasPrice();

    // Calculate required value with 1.5x buffer
    const requiredValue = (gasEstimate * gasPrice * 15n) / 10n;

    console.log(chalk.blue('\n=== Gas Estimation ==='));
    console.log(
      chalk.cyan('Estimated Gas:'),
      chalk.green(gasEstimate.toString())
    );
    console.log(chalk.cyan('Gas Price:'), chalk.green(gasPrice.toString()));
    console.log(
      chalk.cyan('Required Value:'),
      chalk.green(requiredValue.toString())
    );

    // Send deposit transaction
    const hash = await walletClient.writeContract({
      address: PORTAL_ADDRESS,
      abi: OptimismPortalABI,
      functionName: 'depositTransaction',
      args: [
        COUNTER_ADDRESS, // _to: address of Counter contract
        0n, // _value: no ETH being sent to the contract
        100000n, // _gasLimit: enough for the call
        false, // _isCreation: not creating a contract
        callData, // _data: encoded function call
      ],
      value: requiredValue, // msg.value: estimated gas cost for L2 execution
    });

    console.log(chalk.yellow.bold('\n=== Deposit Transaction ===\n'));
    console.log(chalk.cyan('Transaction Hash:'), chalk.green(hash));
    console.log(
      chalk.cyan('Blockscout URL:'),
      chalk.green(`https://sepolia.etherscan.io/tx/${hash}`)
    );

    // Wait for transaction receipt to get event logs
    const receipt = await sepoliaClient.waitForTransactionReceipt({ hash });

    const depositEvents = receipt.logs
      .filter(
        (log) => log.address.toLowerCase() === PORTAL_ADDRESS.toLowerCase()
      )
      .map((log) => {
        try {
          return decodeEventLog({
            abi: OptimismPortalABI,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return null;
        }
      })
      .filter((event) => event?.eventName === 'TransactionDeposited');

    if (depositEvents.length > 0) {
      console.log(chalk.cyan('\nDeposit Event:'));
      // Custom replacer function to handle BigInt
      const replacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };
      console.log(chalk.green(JSON.stringify(depositEvents[0], replacer, 2)));
    }
  } catch (error) {
    console.error(chalk.red('Error depositing transaction:'), error);
  }
}

// Update main function
async function main() {
  await getNetworkBlocks();
  await getContractState();
  await depositToOptimism(42n); // Example: deposit with value 42
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  // @ts-ignore
  process.exit(1);
});
