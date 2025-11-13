import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

const LandingPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center">
      <Head>
        <title>Trustless Vault</title>
        <meta name="description" content="Stake tBTC and wBTC for dividends across chains" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="text-center p-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Welcome to <span className="text-orange-500">Trustless Vault</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Stake your tBTC and wBTC to earn dividends across multiple chains.
        </p>
        <Link href="/app" className="btn-primary">
          Go to App
        </Link>
      </main>
    </div>
  );
};

export default LandingPage;
