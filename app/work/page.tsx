import { WorkIndex } from '@/components/WorkIndex';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Work | Zateef International',
  description: 'Sportswear and streetwear made to your design: from first sample to bulk production and delivery.',
};

export default function WorkPage() {
  return <WorkIndex />;
}
