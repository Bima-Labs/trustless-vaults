import type { NextPage } from 'next';
import Head from 'next/head';
import AdminPanel from '../components/AdminPanel';

const AdminPage: NextPage = () => {
  return (
    <div className="min-h-screen">
      <Head>
        <title>Admin Dashboard - Trustless Vault</title>
        <meta name="description" content="Admin dashboard for Trustless Vault" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="main-container">
        <AdminPanel />
      </main>
    </div>
  );
};

export default AdminPage;