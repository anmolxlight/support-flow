import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SupportFlow AI - Conversational Intelligence Platform',
  description:
    'Build production-ready voice agents with natural conversations, guardrailed reasoning, and real-time analytics.',
  openGraph: {
    title: 'SupportFlow AI',
    description: 'Conversational intelligence platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="dark" storageKey="supportflow-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
