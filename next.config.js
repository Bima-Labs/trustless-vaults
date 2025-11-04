/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Note on Tailwind CSS:
  // Next.js automatically detects and configures Tailwind CSS when it finds a `tailwind.config.js`
  // and `postcss.config.js` file in your project. No special configuration is needed here for it to work.

  // Note on Environment Variables:
  // To expose a variable to the browser, prefix it with `NEXT_PUBLIC_`.
  // Server-only variables (like your database credentials or Etherscan API key) should not have the prefix.
  // They are securely handled on the server and are not exposed to the client.
};

module.exports = nextConfig;
