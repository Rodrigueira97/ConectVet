import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from './components/Toast';

export const metadata: Metadata = {
  title: 'ConectVet',
  description: 'Plataforma de conectação veterinária',
  icons: { icon: '/logo.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
