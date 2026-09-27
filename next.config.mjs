const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig = {
  output: isDevelopment ? undefined : 'export',
  ...(isDevelopment && {
    async rewrites() {
      const backend = 'http://127.0.0.1:5000';
      return [
        { source: '/api/:path*', destination: `${backend}/api/:path*` },
        { source: '/login', destination: `${backend}/login` },
        { source: '/callback', destination: `${backend}/callback` },
        { source: '/logout', destination: `${backend}/logout` }
      ];
    }
  })
};

export default nextConfig;
