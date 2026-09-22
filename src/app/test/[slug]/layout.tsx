import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const defaultImage = 'https://ziya-baran-akademi.vercel.app/logo-icon.png';
  const defaultTitle = 'İnteraktif Test | Ziya Baran Akademi';
  const defaultDesc = 'Ziya Baran Akademi çoktan seçmeli interaktif İngilizce testleri.';

  try {
    const { data: testItem } = await supabaseAdmin
      .from('manual_tests')
      .select('title, description, test_questions(image_url)')
      .eq('slug', params.slug)
      .single();

    if (!testItem) {
      return {
        title: defaultTitle,
        description: defaultDesc,
      };
    }

    const title = `${testItem.title} | Ziya Baran Akademi`;
    const cleanDesc =
      testItem.description ||
      `${testItem.test_questions?.length || 0} soruluk interaktif İngilizce testi.`;

    // Image hierarchy:
    // 1. Question image
    // 2. Platform logo
    let chosenImage: string | undefined;
    if (testItem.test_questions && testItem.test_questions.length > 0) {
      const firstWithImg = testItem.test_questions.find((q: any) => q.image_url?.trim());
      if (firstWithImg) chosenImage = firstWithImg.image_url.trim();
    }
    const finalImage = chosenImage || defaultImage;

    return {
      title,
      description: cleanDesc,
      openGraph: {
        title: testItem.title,
        description: cleanDesc,
        url: `https://ziya-baran-akademi.vercel.app/test/${params.slug}`,
        siteName: 'Ziya Baran Akademi',
        images: [
          {
            url: finalImage,
            width: 1200,
            height: 630,
            alt: testItem.title,
          },
        ],
        locale: 'tr_TR',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: testItem.title,
        description: cleanDesc,
        images: [finalImage],
      },
    };
  } catch {
    return {
      title: defaultTitle,
      description: defaultDesc,
    };
  }
}

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
