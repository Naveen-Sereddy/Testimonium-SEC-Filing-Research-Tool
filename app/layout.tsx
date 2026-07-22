import type { Metadata } from 'next';
import { GeistSans, GeistMono } from 'geist/font';
import { Source_Serif_4 } from 'next/font/google';
import './globals.css';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-serif',
});

export const metadata: Metadata = {
  title: 'Testimonium — Financial Document Intelligence',
  description: 'Ask questions about SEC 10-K filings and get page-cited answers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${GeistSans.variable} ${GeistMono.variable} ${sourceSerif.variable}`}>
      <body className="font-ui text-[14px] leading-[20px]">{children}</body>
    </html>
  );
}
