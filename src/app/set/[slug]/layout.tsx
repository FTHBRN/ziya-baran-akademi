import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { decodeSetDescription } from '@/lib/set-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const defaultImage = 'https://ziya-baran-akademi.vercel.app/logo-icon.png';
  const defaultTitle = 'Çalışma Seti | Ziya Baran Akademi';
  const defaultDesc = 'Ziya Baran Akademi interaktif İngilizce kelime seti ve alıştırmaları.';

  try {
    const { data: setItem } = await supabaseAdmin
      .from('sets')
      .select('title, description, set_cards(image_url, order_index)')
      .eq('slug', params.slug)
      .single();

    if (!setItem) {
      return {
        title: defaultTitle,
        description: defaultDesc,
      };
    }

    const decoded = decodeSetDescription(setItem.description);
    const title = `${setItem.title} | Ziya Baran Akademi`;
    const cleanDesc =
      decoded.storyMeta?.subtitle ||
      decoded.description ||
      `${setItem.set_cards?.length || 0} kelimelik interaktif çalışma seti.`;

    // Image hierarchy:
    // 1. Dedicated cover image
    // 2. First card image
    // 3. Fallback site logo
    let chosenImage = decoded.coverImageUrl?.trim();
    if (!chosenImage && setItem.set_cards && setItem.set_cards.length > 0) {
      const sorted = [...setItem.set_cards].sort(
        (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
      );
      const firstWithImg = sorted.find((c: any) => c.image_url?.trim());
      if (firstWithImg) chosenImage = firstWithImg.image_url.trim();
    }
    const finalImage = chosenImage || defaultImage;

    return {
      title,
      description: cleanDesc,
      openGraph: {
        title: setItem.title,
        description: cleanDesc,
        url: `https://ziya-baran-akademi.vercel.app/set/${params.slug}`,
        siteName: 'Ziya Baran Akademi',
        images: [
          {
            url: finalImage,
            width: 1200,
            height: 630,
            alt: setItem.title,
          },
        ],
        locale: 'tr_TR',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: setItem.title,
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

export default function SetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
