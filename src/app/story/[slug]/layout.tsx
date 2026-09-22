import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const defaultImage = 'https://ziya-baran-akademi.vercel.app/logo-icon.png';
  const defaultTitle = 'Sesli Hikâye | Ziya Baran Akademi';
  const defaultDesc = 'Ziya Baran Akademi sesli ve resimli İngilizce hikâyeler.';

  try {
    const { data: story } = await supabaseAdmin
      .from('stories')
      .select('title, description, cover_image_url, story_pages(image_url, page_number)')
      .eq('slug', params.slug)
      .single();

    if (!story) {
      return {
        title: defaultTitle,
        description: defaultDesc,
      };
    }

    const title = `${story.title} | Ziya Baran Akademi`;
    const cleanDesc =
      story.description ||
      `${story.story_pages?.length || 0} sayfalık sesli ve resimli İngilizce hikâye.`;

    // Image hierarchy:
    // 1. Story cover image
    // 2. First story page image
    // 3. Platform logo
    let chosenImage = story.cover_image_url?.trim();
    if (!chosenImage && story.story_pages && story.story_pages.length > 0) {
      const sorted = [...story.story_pages].sort(
        (a: any, b: any) => (a.page_number || 0) - (b.page_number || 0)
      );
      const firstWithImg = sorted.find((p: any) => p.image_url?.trim());
      if (firstWithImg) chosenImage = firstWithImg.image_url.trim();
    }
    const finalImage = chosenImage || defaultImage;

    return {
      title,
      description: cleanDesc,
      openGraph: {
        title: story.title,
        description: cleanDesc,
        url: `https://ziya-baran-akademi.vercel.app/story/${params.slug}`,
        siteName: 'Ziya Baran Akademi',
        images: [
          {
            url: finalImage,
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
        title: story.title,
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

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
