import type { AppProps } from 'next/app';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Make sure you have a globals.css file with Tailwind directives.
// e.g., @tailwind base; @tailwind components; @tailwind utilities;
import '../styles/globals.css'; 

// 1. Create a Wagmi config
const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

// 2. Create a TanStack Query client
const queryClient = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  </WagmiProvider>;
}

export default MyApp;
