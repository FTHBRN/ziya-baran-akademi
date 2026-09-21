import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const { data: testItem } = await supabase
      .from('manual_tests')
      .select('title, description')
      .eq('slug', slug)
      .maybeSingle();

    if (!testItem) {
      return {
        title: 'Test Bulunamadı | Ziya Baran Akademi',
      };
    }

    const title = `${testItem.title} - Testi Çöz | Ziya Baran Akademi`;
    const description = testItem.description || 'İnteraktif 4 şıklı İngilizce testi. Hemen çözün ve kendinizi test edin!';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: 'Ziya Baran Akademi',
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch (e) {
    return {
      title: 'İngilizce Testi | Ziya Baran Akademi',
    };
  }
}

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
