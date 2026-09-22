import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { decodeModuleMetadata } from '@/lib/module-utils';
import { decodeSetDescription } from '@/lib/set-utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const defaultImage = 'https://ziya-baran-akademi.vercel.app/logo-icon.png';
  const defaultTitle = 'Ders Modülü | Ziya Baran Akademi';
  const defaultDesc = 'Ziya Baran Akademi ders modülü ve konu içerikleri.';

  try {
    const { data: cls } = await supabaseAdmin
      .from('classes')
      .select('name, description, folders(sets(description, set_cards(image_url)))')
      .eq('slug', params.slug)
      .single();

    if (!cls) {
      return {
        title: defaultTitle,
        description: defaultDesc,
      };
    }

    const modMeta = decodeModuleMetadata(cls.description, 0, cls.name);
    const title = `${cls.name} | Ziya Baran Akademi`;
    const cleanDesc = modMeta.description || 'Ders modülü ve konu içerikleri.';

    // Search for first set cover or card image inside module
    let chosenImage: string | undefined;
    if (cls.folders && cls.folders.length > 0) {
      for (const f of cls.folders as any[]) {
        if (f.sets && f.sets.length > 0) {
          for (const s of f.sets) {
            const dec = decodeSetDescription(s.description);
            if (dec.coverImageUrl?.trim()) {
              chosenImage = dec.coverImageUrl.trim();
              break;
            }
            if (s.set_cards && s.set_cards.length > 0) {
              const cardWithImg = s.set_cards.find((c: any) => c.image_url?.trim());
              if (cardWithImg) {
                chosenImage = cardWithImg.image_url.trim();
                break;
              }
            }
          }
        }
        if (chosenImage) break;
      }
    }

    const finalImage = chosenImage || defaultImage;

    return {
      title,
      description: cleanDesc,
      openGraph: {
        title: cls.name,
        description: cleanDesc,
        url: `https://ziya-baran-akademi.vercel.app/module/${params.slug}`,
        siteName: 'Ziya Baran Akademi',
        images: [
          {
            url: finalImage,
            width: 1200,
            height: 630,
            alt: cls.name,
          },
        ],
        locale: 'tr_TR',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: cls.name,
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

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
