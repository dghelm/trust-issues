// import { useState } from "react";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";

import { DynamicWidget, useIsLoggedIn, useDynamicContext} from '@dynamic-labs/sdk-react-core';
import { Core } from '@walletconnect/core'
import { WalletKit } from '@reown/walletkit'

const core = new Core({
  projectId: '3841e6a8d97c05eae0d4b53eeca45d6d'
})

const metadata = {
  name: 'ethglobal-devcon',
  description: 'AppKit Example',
  url: 'https://dgh.works', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

const walletKit = await WalletKit.init({
  core, // <- pass the shared 'core' instance
  metadata
})

function App() {
  // const [greetMsg, setGreetMsg] = useState("");
  // const [name, setName] = useState("");

  const isL1Connected = useIsLoggedIn();
  const { primaryWallet } = useDynamicContext();
  

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <main className="container">
      <h2>Step 1: Connect Wallet to L1</h2>
      <DynamicWidget />

      { isL1Connected ? 'connected' : 'not connected' }

      <br />

      { `${primaryWallet?.address || 'no address'}` }

      <h2>Step 2: Connect to L2 dApp</h2>



      {/* <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p> */}
    </main>
  );
}

export default App;
