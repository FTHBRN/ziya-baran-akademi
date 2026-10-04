import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import sharp from 'sharp';

// Disable TLS rejection for local development / Windows
if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const maxDuration = 60; // Allow up to 60 seconds on Vercel Pro if needed

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'PDF dosyası bulunamadı.' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    
    // Dynamic import of pdfjs-dist legacy build and its worker
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
    // @ts-ignore
    await import('pdfjs-dist/legacy/build/pdf.worker.js');

    const doc = await pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    }).promise;

    const numPages = doc.numPages;
    const extractedPages: Array<{
      page_number: number;
      english_text: string;
      turkish_text: string;
      image_url: string;
    }> = [];

    let detectedStoryTitle = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Separate items by spatial X coordinate (English is left ~200-400, Turkish is right ~500+)
      const leftItems: Array<{ y: number; x: number; str: string }> = [];
      const rightItems: Array<{ y: number; x: number; str: string }> = [];

      for (const item of textContent.items as any[]) {
        const str = (item.str || '').trim();
        if (!str) continue;

        const x = item.transform[4];
        const y = item.transform[5];

        // Check for story title in header (usually at top Y > 530)
        if (!detectedStoryTitle && y > 530 && str.length > 3) {
          // e.g. "THE TALKING DOG • KONUŞAN KÖPEK"
          detectedStoryTitle = str.split('•')[0].trim();
        }

        // Filter out page numbers (e.g. "1 / 20" or "PART 01" or column headers "ENGLISH" / "TÜRKÇE")
        if (str.match(/^\d+\s*\/\s*\d+$/) || str.match(/^PART\s+\d+$/i) || str === 'ENGLISH' || str === 'TÜRKÇE') {
          continue;
        }

        // Header titles
        if (y > 520) continue;

        // Kodex / standard story layout: English is left column (150 <= X < 515), Turkish is right column (X >= 515)
        if (x >= 515) {
          rightItems.push({ y, x, str: item.str });
        } else if (x >= 150) {
          leftItems.push({ y, x, str: item.str });
        }
      }

      // Sort lines by descending Y (top to bottom), then ascending X (left to right)
      leftItems.sort((a, b) => Math.abs(b.y - a.y) < 5 ? a.x - b.x : b.y - a.y);
      rightItems.sort((a, b) => Math.abs(b.y - a.y) < 5 ? a.x - b.x : b.y - a.y);

      let englishText = leftItems.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
      let turkishText = rightItems.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();

      // Extract image on this page
      let imageUrl = '';
      try {
        const ops = await page.getOperatorList();
        for (let i = 0; i < ops.fnArray.length; i++) {
          if (
            ops.fnArray[i] === pdfjs.OPS.paintImageXObject ||
            ops.fnArray[i] === pdfjs.OPS.paintInlineImageXObject
          ) {
            const imgName = ops.argsArray[i][0];
            const imgObj: any = await new Promise(resolve => {
              page.objs.get(imgName, (data: any) => resolve(data));
            });

            if (imgObj && imgObj.data && imgObj.width > 100 && imgObj.height > 100) {
              let channels: 1 | 3 | 4 = 3;
              const expectedSize = imgObj.width * imgObj.height;
              if (imgObj.data.length === expectedSize * 4) channels = 4;
              else if (imgObj.data.length === expectedSize) channels = 1;

              const webpBuffer = await sharp(Buffer.from(imgObj.data), {
                raw: {
                  width: imgObj.width,
                  height: imgObj.height,
                  channels,
                },
              })
                .webp({ quality: 85 })
                .toBuffer();

              // Upload directly to Supabase storage 'media' bucket
              const fileName = `story-pdf-${Date.now()}-p${pageNum}-${Math.random().toString(36).substring(2, 6)}.webp`;
              const { error: uploadError } = await supabaseAdmin.storage
                .from('media')
                .upload(fileName, webpBuffer, {
                  contentType: 'image/webp',
                  upsert: true,
                });

              if (!uploadError) {
                const { data: publicUrlData } = supabaseAdmin.storage
                  .from('media')
                  .getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
              }
              break; // Took the primary page illustration
            }
          }
        }
      } catch (imgErr) {
        console.warn(`Page ${pageNum} image extraction error:`, imgErr);
      }

      extractedPages.push({
        page_number: pageNum,
        english_text: englishText,
        turkish_text: turkishText,
        image_url: imageUrl,
      });
    }

    // Fallback title from filename if not detected
    if (!detectedStoryTitle) {
      detectedStoryTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      title: detectedStoryTitle,
      cover_image_url: extractedPages[0]?.image_url || '',
      pages: extractedPages,
    });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return NextResponse.json({ error: error.message || 'PDF işlenirken bir hata oluştu.' }, { status: 500 });
  }
}
