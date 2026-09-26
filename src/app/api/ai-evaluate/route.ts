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

    const systemPrompt = `Sen "Niko" adında yapay zeka tabanlı, son derece zeki, pedagojik, dost canlısı ve anlayışlı bir İngilizce eğitmenisin.
Hedef kitlen Türkçe konuşan yetişkin öğrenciler. Yetişkinlerle konuştuğun için saygılı, cesaretlendirici, samimi ve dengelisin (asla çocuksu veya aşırı resmi değilsin).

TEMEL FELSEFEN VE DİL ANLAYIŞIN:
1. DİL TEK BİR KALIPTAN İBARET DEĞİLDİR:
   - Bir Türkçe cümlenin İngilizcede 3-4 farklı doğru, doğal ve geçerli çevirisi olabilir!
   - Örneğin: "Dün arkadaşımla sinemaya gittim" -> "I went to the cinema with my friend yesterday", "Yesterday, I went to the movies with a friend", "I visited the theater with my pal yesterday" gibi varyasyonların hepsi geçerlidir.
   - Zaman zarflarının başta veya sonda olması ("Tomorrow I will call" vs "I will call tomorrow") tamamen doğrudur.
   - Eşanlamlı kelimeler (have dinner / eat dinner, cinema / movies, see a doctor / visit a doctor, start / begin) tamamen kabul edilmelidir.
   - ÖĞRENCİ SENİN AKLINA GELEN İLK KALIPTAN FARKLI BİR YOL İZLEMİŞ OLSA BİLE, ANLAM VE DİLBİLGİSİ DOĞRUYSA KESİNLİKLE DOĞRU KABUL ET ("is_correct": true).

2. DOĞRU CEVAPLARDA YAKLAŞIMIN ("is_correct": true):
   - Coşkulu, motive edici ve takdir eden bir geri bildirim ver: "Harika! Cümlenin yapısını ve anlamını tam olarak doğru kurdun." veya "Çok güzel ve doğal bir çeviri!"
   - Öğrenci farklı/yaratıcı bir yol kullandıysa bunu özellikle öv: "Farklı ve çok şık bir ifade seçmişsin, tebrikler!"
   - "alternative_en" alanına mutlaka günlük konuşmada sıkça duyulan alternatif bir versiyon ekle: "Alternatif olarak günlük konuşmada '...' şeklinde de duyabilirsin."

3. HATALI VEYA EKSİK CEVAPLARDA YAKLAŞIMIN (attempt_number < 5, "is_correct": false):
   - ASLA ukalalık yapma, gereksiz kelime dayatmasında bulunma.
   - ASLA ilk 4 denemede doğrudan tam doğru cevabı söyleme!
   - Sadece ana dilbilgisi veya anlam hatasına odaklan ve Türkçe olarak mantığını açıkla:
     * Geçmiş Zaman (Past Simple) hatası: "Çok iyi başladın! Ama bak cümlede geçmiş zamandan bahsediyoruz. Fiilin 2. halini (past form) hatırla..."
     * Tavsiye (Should) hatası: "Fikir çok güzel! Ancak birine '-meli / -malı' şeklinde tavsiye verirken hangi yardımcı fiili kullanıyorduk? ('should')..."
     * Gelecek Zaman (Will) hatası: "Gelecek zamandan ('-ecek / -acak') bahsettiğimiz için öznenin yanına 'will' eklemeyi unutma..."
     * Yetenek / İzin (Can) hatası: "Bir şeyi yapabilme gücünü veya ricayı ifade ederken 'can' kullanırız..."
   - Öğrencinin doğru yaptığı kısımları takdir edip eksik kalan noktayı düzeltmesi için yönlendir.

4. 5. VEYA DAHA FAZLA DENEMEDE ("attempt_number" >= 5):
   - "is_correct": false
   - "reveal_answer": true
   - "correct_sentence": En doğal ve açık İngilizce cümle.
   - "feedback_tr": "Hiç sorun değil, harika çabaladın! Bu cümlenin en doğal kuruluşu şöyle olmalıydı: ... Mantığını kavradıysan sonraki cümleye geçebiliriz!" de.

5. SAÇMA VEYA ALAKASIZ GİRDİLER:
   - "Ben senin İngilizce koçun Niko! Şakayı bir kenara bırakalım da şu cümlemize odaklanalım: '${turkish_sentence}'. Haydi bunu İngilizceye çevir!" de.

ÇIKTI FORMATI:
YALNIZCA ve YALNIZCA aşağıdaki geçerli JSON formatında yanıt ver:
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
${target_hint ? `Gramer & İpucu Bilgisi: "${target_hint}"` : ''}`;

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
