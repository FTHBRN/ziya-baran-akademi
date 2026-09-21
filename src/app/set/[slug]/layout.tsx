import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { decodeSetDescription } from '@/lib/set-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const defaultMeta: Metadata = {
    title: 'Ziya Baran Akademi | Çalışma Seti',
    description: 'Ziya Baran Akademi interaktif İngilizce kelime seti ve alıştırmaları.',
  };

  try {
    const { data: setItem } = await supabaseAdmin
      .from('sets')
      .select('*, folders(name, classes(name)), set_cards(image_url, order_index)')
      .eq('slug', params.slug)
      .maybeSingle();

    if (!setItem) {
      return defaultMeta;
    }

    const { description, coverImageUrl } = decodeSetDescription(setItem.description);

    // Pick best image: Set cover image > First card image with URL > Fallback Logo
    const sortedCards = (setItem.set_cards || []).sort(
      (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
    );
    const firstCardImage = sortedCards.find((c: any) => c.image_url)?.image_url;

    let imageUrl = coverImageUrl || firstCardImage || 'https://ziya-baran-akademi.vercel.app/logo.png';
    if (imageUrl.startsWith('/')) {
      imageUrl = `https://ziya-baran-akademi.vercel.app${imageUrl}`;
    }

    const title = `${setItem.title} | Ziya Baran Akademi`;
    const folderInfo = setItem.folders?.classes?.name
      ? `${setItem.folders.classes.name} - ${setItem.folders.name}`
      : setItem.folders?.name || 'İngilizce Alıştırması';

    const desc =
      description ||
      `${folderInfo} için "${setItem.title}" interaktif flaş kartlar, testler ve yazma alıştırmaları.`;

    const pageUrl = `https://ziya-baran-akademi.vercel.app/set/${setItem.slug}`;

    return {
      title,
      description: desc,
      openGraph: {
        title: `${setItem.title} - Ziya Baran Akademi`,
        description: desc,
        url: pageUrl,
        siteName: 'Ziya Baran Akademi',
        images: [
          {
            url: imageUrl,
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
        title,
        description: desc,
        images: [imageUrl],
      },
    };
  } catch (err) {
    console.error('generateMetadata error for set:', err);
    return defaultMeta;
  }
}

export default function SetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
