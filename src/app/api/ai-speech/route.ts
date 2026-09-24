import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY sunucuda tanımlı değil.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('file') as Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Ses dosyası alınamadı.' },
        { status: 400 }
      );
    }

    // Prepare FormData for Groq Whisper API
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile, 'audio.webm');
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', 'en'); // Expecting English translation spoken by the student
    groqFormData.append('temperature', '0.0');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
      body: groqFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Groq Whisper error:', res.status, errText);
      return NextResponse.json(
        { error: `Ses tanıma hatası (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const transcript = (data.text || '').trim();

    return NextResponse.json({
      success: true,
      text: transcript,
    });
  } catch (error: any) {
    console.error('API /api/ai-speech error:', error);
    return NextResponse.json(
      { error: error.message || 'Ses işlenirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
