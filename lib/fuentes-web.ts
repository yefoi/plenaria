import { Source_Sans_3, Source_Serif_4 } from 'next/font/google';

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--fuente-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--fuente-serif',
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

export const FUENTES = { sans, serif };
