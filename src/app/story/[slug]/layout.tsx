import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const defaultMeta: Metadata = {
    title: 'Ziya Baran Akademi | Hikâye',
    description: 'Ziya Baran Akademi sesli ve resimli İngilizce hikâyeler.',
  };

  try {
    const { data: story } = await supabaseAdmin
      .from('stories')
      .select('*, folders(name, classes(name))')
      .eq('slug', params.slug)
      .maybeSingle();

    if (!story) {
      return defaultMeta;
    }

    let imageUrl = story.cover_image_url || 'https://ziya-baran-akademi.vercel.app/logo.png';
    if (imageUrl.startsWith('/')) {
      imageUrl = `https://ziya-baran-akademi.vercel.app${imageUrl}`;
    }

    const title = `${story.title} | Ziya Baran Akademi`;
    const desc = `Ziya Baran Akademi'de "${story.title}" İngilizce e-kitabını sesli telaffuz ve Türkçe okunuş rehberiyle okuyun.`;
    const pageUrl = `https://ziya-baran-akademi.vercel.app/story/${story.slug}`;

    return {
      title,
      description: desc,
      openGraph: {
        title: `${story.title} - Ziya Baran Akademi`,
        description: desc,
        url: pageUrl,
        siteName: 'Ziya Baran Akademi',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: story.title,
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
    console.error('generateMetadata error for story:', err);
    return defaultMeta;
  }
}

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
