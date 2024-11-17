# Trust Issues 🚪

A local desktop application that helps you sleep better at night by making it easy to exit Layer 2 rollups directly through Layer 1 - even if the L2 turns against you.

## Why Trust Issues?

Rollups are revolutionizing Ethereum scaling, but their security model relies on users being able to "rage quit" - withdrawing their assets directly through L1 if the L2 becomes malicious or unresponsive. While this capability exists in theory, it's typically accessible only to technical users comfortable with CLIs and smart contract interactions.

Trust Issues bridges this gap by providing a user-friendly interface for preparing and executing L1 escape hatches. No advanced knowledge required - just connect your wallet and sleep soundly knowing you can always get your assets back.

## Features

- 🔌 Simple wallet integration via Dynamic SDK
- 🛠️ Automatic L1 escape transaction construction
- 🔒 Local-first security with Tauri
- 🎯 Support for complex positions (not just ETH!)
- 📱 Modern, clean interface with Tailwind CSS

## Getting Started

### Prerequisites

- An Ethereum wallet
- Node.js 18+
- Rust (for Tauri)
- pnpm package manager

### Installation

1. Clone the repository
```bash
git clone https://github.com/dghelm/trust-issues.git
cd trust-issues
```

2. Install dependencies
```bash
pnpm install
```

3. Run the development build
```bash
pnpm tauri dev
```

## How It Works

Trust Issues uses a dual-role architecture:

1. Acts as a WalletConnect peer when connecting to L2 dApps, intercepting and analyzing their transaction requests
2. Functions as a dApp when connecting to your L1 wallet through Dynamic SDK, constructing the necessary escape transactions

This architecture allows seamless bridging between L2 interactions and L1 safety mechanisms.

## Technology Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Ethereum Interactions**: Viem
- **Desktop Runtime**: Tauri (Rust)
- **Wallet Integration**: Dynamic SDK
- **Cross-Layer Communication**: WalletConnect
- **Development**: Vite

## Security

This is experimental software. While we've designed it with security in mind:
- All sensitive operations run locally through Tauri
- No external servers or dependencies for core functionality
- Open source and auditable
- Always verify transactions before signing

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.