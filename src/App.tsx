import { useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { WalletKitComponent } from './components/WalletKit';

function App() {
  const isLoggedIn = useIsLoggedIn();

  return (
    <div>
      <h1>Wallet App</h1>
      <DynamicWidget />
      {isLoggedIn && <WalletKitComponent />}
    </div>
  );
}

export default App;
