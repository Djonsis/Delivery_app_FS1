import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Добавляем обработку Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Добавляем webpack конфигурацию для корректной работы с Firebase
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Исключаем клиентские модули из серверной сборки
      config.externals = config.externals || [];
      config.externals.push({
        'firebase/app': 'firebase/app',
        'firebase/firestore': 'firebase/firestore',
      });
    }
    return config;
  },
};

export default nextConfig;