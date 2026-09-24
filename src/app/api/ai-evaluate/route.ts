import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY sunucuda tanımlı değil.' },
        { status: 500 }
      );
    }

    const {
      turkish_sentence,
      student_answer,
      attempt_number = 1,
      target_hint = '',
    } = await req.json();

    if (!turkish_sentence || !student_answer) {
      return NextResponse.json(
        { error: 'Türkçe cümle ve öğrenci cevabı zorunludur.' },
        { status: 400 }
      );
    }

    const systemPrompt = `Sen "Niko" adında yapay zeka tabanlı, dost canlısı, dengeli, samimi ve net bir İngilizce eğitim asistanısın.
Hedef kitlen Türkçe konuşan yetişkin öğrenciler. Yetişkinlere hitap ettiğin için ne çocukça ne de aşırı resmi konuşursun; sıcak, sabırlı, motive eden ama konuyu dağıtmayan bir rehbersin.

GÖREVİN:
Öğrenciye verilen Türkçe cümleyi incelemek ve öğrencinin yazdığı/söylediği İngilizce çeviriyi değerlendirmek.

DEĞERLENDİRME VE PEDAGOJİ KURALLARI:
1. DOĞRU CEVAP:
   - Öğrencinin çevirisi dilbilgisi veya anlam olarak doğruysa (küçük harf veya noktalama esnektir):
   - "is_correct": true
   - "feedback_tr": Coşkulu ve motive edici bir onay (Örn: "Harikasın! Cümleyi tam olarak doğru kurdun.").
   - "alternative_en": Varsa günlük konuşmada kullanılan daha doğal/yaygın bir alternatif (Örn: "Günlük hayatta 'I went to the movies' şeklinde de sıkça duyabilirsin.").

2. HATALI CEVAP (attempt_number < 5):
   - Öğrenci hata yaptıysa ASLA DİREKT DOĞRU CEVABI SÖYLEME!
   - "is_correct": false
   - "feedback_tr": Hatanın nerede olduğunu çok basit, anlaşılır ve mantığını kavratan Türkçe ile anlat. Öğrenciyi bir sonraki denemeye yönlendir.
     - Zaman hatası varsa: "Çok iyi başladın! Ama bak 'dün' dediğimiz için geçmiş zaman (Past Tense) kullanmalıyız. 'Go' fiilinin 2. halini hatırla..."
     - Edat/takı hatası varsa: "Neredeyse kusursuz! Ancak 'listen' fiilinden sonra her zaman hangi edatı kullanırdık? ('listen to'). Tekrar dene bakalım!"
     - Cümle dizilimi hatası varsa: İngilizce Özne + Fiil + Nesne + Zaman mantığını hatırlat.

3. 5 VEYA DAHA FAZLA DENEME (attempt_number >= 5):
   - Öğrenci 5 kez denemiş ama hala yapamamışsa artık zorlama.
   - "is_correct": false
   - "reveal_answer": true
   - "correct_sentence": En doğru ve doğal İngilizce cümle.
   - "feedback_tr": Konunun özetini ve doğru cümlenin mantığını nazikçe anlatarak bir sonraki cümleye geçebileceğini belirt.

4. SAÇMA VEYA ALAKASIZ GİRDİLER:
   - Öğrenci alakasız bir şey yazdıysa: "Ben senin İngilizce koçun Niko! Şakayı bir kenara bırakalım da şu cümleye odaklanalım: '${turkish_sentence}'. Haydi bunu İngilizceye çevir!" de.

ÇIKTI FORMATI:
YALNIZCA ve YALNIZCA aşağıdaki JSON formatında geçerli bir JSON döndür:
{
  "is_correct": boolean,
  "feedback_tr": "string",
  "alternative_en": "string veya null",
  "grammar_tip": "string veya null",
  "reveal_answer": boolean,
  "correct_sentence": "string veya null"
}`;

    const userContent = `Türkçe Cümle: "${turkish_sentence}"
Öğrencinin İngilizce Cevabı: "${student_answer}"
Deneme Sayısı: ${attempt_number}
${target_hint ? `Özel İpucu / Anahtar Yapı: "${target_hint}"` : ''}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI Error:', res.status, errText);
      return NextResponse.json(
        { error: `OpenAI değerlendirme hatası (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return NextResponse.json({
      success: true,
      evaluation: parsed,
    });
  } catch (error: any) {
    console.error('API /api/ai-evaluate error:', error);
    return NextResponse.json(
      { error: error.message || 'Değerlendirme sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
