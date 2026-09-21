import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text')?.trim();

    if (!text || text.length > 600) {
      return new NextResponse('Geçersiz veya çok uzun metin parametresi', { status: 400 });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata('en-US-JennyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const { audioStream } = tts.toStream(text);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => {
        try {
          tts.close();
        } catch {}
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err) => {
        try {
          tts.close();
        } catch {}
        reject(err);
      });
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Edge TTS Hatası:', error);
    return new NextResponse('TTS oluşturulamadı', { status: 500 });
  }
}
