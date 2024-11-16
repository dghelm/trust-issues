import { Core } from '@walletconnect/core'
import { WalletKit } from '@reown/walletkit'

const core = new Core({
  projectId: '3841e6a8d97c05eae0d4b53eeca45d6d'
})

const metadata = {
  name: 'ethglobal-devcon',
  description: 'Trust Issues - L2 Connector',
  url: 'https://reown.com/appkit', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

const walletKit = await WalletKit.init({
  core, // <- pass the shared 'core' instance
  metadata
})