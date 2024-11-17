import { useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { WalletKitComponent } from './components/WalletKit';

function App() {
  const isLoggedIn = useIsLoggedIn();

  return (
    <div className="min-h-screen bg-background">
      <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <h1 className="text-xl font-bold">Trust Issues</h1>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <DynamicWidget />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <WalletKitComponent />
      </main>
    </div>
  );
}

export default App;
