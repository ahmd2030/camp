import { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

export const metadata: Metadata = {
  title: 'Mango AI - الحلول التكنولوجية لربط العملاء بالمنتجات',
  description: 'منصة ذكية تعتمد على التكنولوجيا المعقدة لجمع الأطراف المحتاجة لبعضها. نقوم ببناء جسور رقمية فائقة الذكاء، نحلل السوق، ونجمع العميل بالمنتج المثالي بدقة عالية.',
  keywords: 'تسويق ذكي, ذكاء اصطناعي, ربط العملاء, حلول تكنولوجية, B2B, مبيعات آلية',
  openGraph: {
    title: 'Mango AI - الحلول التكنولوجية لربط العملاء بالمنتجات',
    description: 'منصة ذكية تعتمد على التكنولوجيا المعقدة لجمع الأطراف المحتاجة لبعضها بدقة جراحية.',
    type: 'website',
  }
};

export default function Home() {
  return <LandingPageClient />;
}
