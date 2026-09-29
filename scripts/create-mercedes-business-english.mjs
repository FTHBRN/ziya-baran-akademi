import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';


// Environment
const envFile = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('Credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

function generateSlug(text) {
  const trMap = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u'
  };
  let str = text;
  for (const k in trMap) {
    str = str.replace(new RegExp(k, 'g'), trMap[k]);
  }
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
}

// --------------------------------------------------------------------------
// 1. DATASETS
// --------------------------------------------------------------------------

const SET_1_WORDS = [
  { en: "available", tr: "mevcut, uygun" },
  { en: "average", tr: "ortalama" },
  { en: "avoid", tr: "kaçınmak" },
  { en: "clarify", tr: "netleştirmek, açıklığa kavuşturmak" },
  { en: "address", tr: "ele almak, ilgilenmek" },
  { en: "assess", tr: "değerlendirmek" },
  { en: "evaluate", tr: "değerlendirmek" },
  { en: "identify", tr: "belirlemek, tespit etmek" },
  { en: "highlight", tr: "vurgulamak" },
  { en: "consider", tr: "değerlendirmek, göz önünde bulundurmak" },
  { en: "align", tr: "aynı noktada buluşmak, uyum sağlamak" },
  { en: "involve", tr: "dahil etmek, içermek" },
  { en: "coordinate", tr: "koordine etmek" },
  { en: "gather", tr: "toplamak" },
  { en: "obtain", tr: "elde etmek" },
  { en: "review", tr: "incelemek, gözden geçirmek" },
  { en: "monitor", tr: "takip etmek, izlemek" },
  { en: "proceed", tr: "devam etmek, ilerlemek" },
  { en: "postpone", tr: "ertelemek" },
  { en: "confirm", tr: "doğrulamak, onaylamak" },
  { en: "summarize", tr: "özetlemek" },
  { en: "outcome", tr: "sonuç" },
  { en: "pending", tr: "beklemede" },
  { en: "required", tr: "gerekli" },
  { en: "necessary", tr: "gerekli" },
  { en: "aware", tr: "farkında, haberdar" },
  { en: "possible risk", tr: "olası risk" },
  { en: "cost of living", tr: "yaşam maliyeti" },
  { en: "increase", tr: "artmak, artırmak" },
  { en: "significantly", tr: "önemli ölçüde" },
  { en: "in order to", tr: "-mek/-mak için" }
];

const SET_2_COLLOCATIONS = [
  { en: "clarify a point", tr: "bir noktayı netleştirmek" },
  { en: "raise an issue", tr: "bir konuyu / sorunu gündeme getirmek" },
  { en: "address a problem", tr: "bir problemi ele almak" },
  { en: "ask for input", tr: "fikir / görüş istemek" },
  { en: "consult the team", tr: "ekibe danışmak" },
  { en: "align on next steps", tr: "sonraki adımlarda mutabık kalmak" },
  { en: "request data", tr: "veri talep etmek" },
  { en: "follow up", tr: "konuyu takip etmek" },
  { en: "summarize the meeting", tr: "toplantıyı özetlemek" },
  { en: "document the decisions", tr: "kararları kayıt altına almak" },
  { en: "define an action item", tr: "yapılacak işi belirlemek" },
  { en: "discuss a pending topic", tr: "bekleyen bir konuyu görüşmek" },
  { en: "comment on a chart", tr: "bir grafik hakkında yorum yapmak" },
  { en: "close with next steps", tr: "sonraki adımları belirleyerek toplantıyı bitirmek" },
  { en: "identify a problem", tr: "problemi tespit etmek" },
  { en: "identify a risk", tr: "riski belirlemek" },
  { en: "evaluate the results", tr: "sonuçları değerlendirmek" },
  { en: "assess the situation", tr: "durumu değerlendirmek" },
  { en: "review the data", tr: "verileri incelemek" },
  { en: "review the document", tr: "dokümanı incelemek" },
  { en: "monitor the progress", tr: "ilerlemeyi takip etmek" },
  { en: "coordinate with the team", tr: "ekiple koordinasyon sağlamak" },
  { en: "confirm the deadline", tr: "son tarihi teyit etmek" },
  { en: "confirm the details", tr: "detayları doğrulamak" },
  { en: "postpone the meeting", tr: "toplantıyı ertelemek" },
  { en: "proceed with the project", tr: "projeye devam etmek" },
  { en: "highlight an important point", tr: "önemli bir noktayı vurgulamak" },
  { en: "gather information", tr: "bilgi toplamak" },
  { en: "obtain approval", tr: "onay almak" },
  { en: "consider the options", tr: "seçenekleri değerlendirmek" },
  { en: "avoid delays", tr: "gecikmeleri önlemek" },
  { en: "be aware of the risks", tr: "risklerin farkında olmak" }
];

const SET_3_MEETINGS = [
  { en: "Shall we start?", tr: "Başlayalım mı?" },
  { en: "Let's get started.", tr: "Başlayalım." },
  { en: "Thanks everyone for joining.", tr: "Katıldığınız için herkese teşekkürler." },
  { en: "Today I'd like to discuss...", tr: "Bugün ... hakkında konuşmak istiyorum." },
  { en: "We have three topics to discuss today.", tr: "Bugün görüşeceğimiz üç konu var." },
  { en: "I'd like to clarify one point.", tr: "Bir noktayı netleştirmek istiyorum." },
  { en: "Could you clarify that, please?", tr: "Bunu açıklığa kavuşturabilir misiniz?" },
  { en: "Could you explain that again?", tr: "Bunu tekrar açıklayabilir misiniz?" },
  { en: "What exactly do you mean?", tr: "Tam olarak ne demek istiyorsunuz?" },
  { en: "As far as I understand...", tr: "Anladığım kadarıyla..." },
  { en: "If I understand correctly...", tr: "Doğru anladıysam..." },
  { en: "I'd like to raise one issue.", tr: "Bir konuyu gündeme getirmek istiyorum." },
  { en: "We need to address this issue.", tr: "Bu konuyu ele almamız gerekiyor." },
  { en: "There seems to be a problem.", tr: "Bir sorun var gibi görünüyor." },
  { en: "What do you think about this?", tr: "Bunun hakkında ne düşünüyorsunuz?" },
  { en: "What's your opinion?", tr: "Sizin görüşünüz nedir?" },
  { en: "Do you have any suggestions?", tr: "Herhangi bir öneriniz var mı?" },
  { en: "Could you give us some input?", tr: "Bize bu konuda görüş verebilir misiniz?" },
  { en: "We need to align on this.", tr: "Bu konuda aynı noktada buluşmamız gerekiyor." },
  { en: "Let's agree on the next steps.", tr: "Sonraki adımlarda anlaşalım." },
  { en: "What are the next steps?", tr: "Sonraki adımlar nelerdir?" },
  { en: "Who will be responsible for this?", tr: "Bundan kim sorumlu olacak?" },
  { en: "When can we complete this?", tr: "Bunu ne zaman tamamlayabiliriz?" },
  { en: "Could you confirm the deadline?", tr: "Son tarihi teyit edebilir misiniz?" },
  { en: "I'll follow up after the meeting.", tr: "Toplantıdan sonra konuyu takip edeceğim." },
  { en: "Let's review the results.", tr: "Sonuçları gözden geçirelim." },
  { en: "Let's review the available data.", tr: "Mevcut verileri inceleyelim." },
  { en: "We need more information.", tr: "Daha fazla bilgiye ihtiyacımız var." },
  { en: "We need to gather more data.", tr: "Daha fazla veri toplamamız gerekiyor." },
  { en: "Can we proceed?", tr: "Devam edebilir miyiz?" },
  { en: "This topic is still pending.", tr: "Bu konu hâlâ beklemede." },
  { en: "Let's summarize what we've discussed.", tr: "Konuştuklarımızı özetleyelim." },
  { en: "I'll send you the details in writing.", tr: "Detayları size yazılı olarak göndereceğim." },
  { en: "Sorry, could you repeat that?", tr: "Affedersiniz, bunu tekrar edebilir misiniz?" },
  { en: "Could you speak a little more slowly?", tr: "Biraz daha yavaş konuşabilir misiniz?" },
  { en: "I'm not sure I understood correctly.", tr: "Doğru anladığımdan emin değilim." },
  { en: "Do you mean that...?", tr: "Şunu mu demek istiyorsunuz...?" },
  { en: "Could you give me an example?", tr: "Bir örnek verebilir misiniz?" },
  { en: "Let me check my notes.", tr: "Notlarıma bakayım." },
  { en: "Give me a moment, please.", tr: "Bana bir dakika verir misiniz?" },
  { en: "I'll check and get back to you.", tr: "Kontrol edip size dönüş yapacağım." },
  { en: "I don't have that information right now.", tr: "Şu anda bu bilgi bende yok." },
  { en: "Let's move on to the next topic.", tr: "Bir sonraki konuya geçelim." }
];

const SET_4_SITUATIONS = [
  { en: "I need to coordinate this with the team in China.", tr: "Bunu Çin'deki ekiple koordine etmem gerekiyor." },
  { en: "We have a meeting with the Chinese team tomorrow.", tr: "Yarın Çin ekibiyle bir toplantımız var." },
  { en: "I need to prepare for the meeting.", tr: "Toplantıya hazırlanmam gerekiyor." },
  { en: "Could you send me the latest data?", tr: "Bana en güncel verileri gönderebilir misiniz?" },
  { en: "We need to review the data before the meeting.", tr: "Toplantıdan önce verileri incelememiz gerekiyor." },
  { en: "I'd like to clarify one point before we proceed.", tr: "Devam etmeden önce bir noktayı netleştirmek istiyorum." },
  { en: "We need to identify the main issue first.", tr: "Önce ana sorunu belirlememiz gerekiyor." },
  { en: "There are several possible risks.", tr: "Birkaç olası risk var." },
  { en: "We should evaluate these risks.", tr: "Bu riskleri değerlendirmeliyiz." },
  { en: "Are you aware of this issue?", tr: "Bu sorundan haberdar mısınız?" },
  { en: "We need to address this problem as soon as possible.", tr: "Bu problemi mümkün olduğunca çabuk ele almamız gerekiyor." },
  { en: "I'd like to highlight an important point.", tr: "Önemli bir noktayı vurgulamak istiyorum." },
  { en: "We need to align with the other team.", tr: "Diğer ekiple aynı noktada buluşmamız gerekiyor." },
  { en: "Could you confirm the current status?", tr: "Mevcut durumu teyit edebilir misiniz?" },
  { en: "Could you confirm the deadline?", tr: "Son tarihi teyit edebilir misiniz?" },
  { en: "The final results are not available yet.", tr: "Nihai sonuçlar henüz mevcut değil." },
  { en: "This topic is still pending.", tr: "Bu konu hâlâ beklemede." },
  { en: "We are waiting for approval.", tr: "Onay bekliyoruz." },
  { en: "We need to obtain approval before we proceed.", tr: "Devam etmeden önce onay almamız gerekiyor." },
  { en: "We need some additional information.", tr: "Bazı ek bilgilere ihtiyacımız var." },
  { en: "Could you provide the required documents?", tr: "Gerekli belgeleri sağlayabilir misiniz?" },
  { en: "I'll gather the information and send it to you.", tr: "Bilgileri toplayıp size göndereceğim." },
  { en: "We should monitor the progress closely.", tr: "İlerlemeyi yakından takip etmeliyiz." },
  { en: "Everything is progressing as planned.", tr: "Her şey planlandığı gibi ilerliyor." },
  { en: "We may have a small delay.", tr: "Küçük bir gecikmemiz olabilir." },
  { en: "We should avoid further delays.", tr: "Daha fazla gecikmeden kaçınmalıyız." },
  { en: "Can we proceed with the current plan?", tr: "Mevcut planla devam edebilir miyiz?" },
  { en: "I think we can proceed.", tr: "Bence devam edebiliriz." },
  { en: "We may need to postpone this topic.", tr: "Bu konuyu ertelememiz gerekebilir." },
  { en: "Let's discuss this again next week.", tr: "Bunu gelecek hafta tekrar görüşelim." },
  { en: "What do you suggest?", tr: "Ne önerirsiniz?" },
  { en: "Do you have any concerns?", tr: "Herhangi bir endişeniz var mı?" },
  { en: "Do you have any questions?", tr: "Herhangi bir sorunuz var mı?" },
  { en: "What is your assessment of the situation?", tr: "Durumla ilgili değerlendirmeniz nedir?" },
  { en: "We need to consider both options.", tr: "Her iki seçeneği de değerlendirmemiz gerekiyor." },
  { en: "Let's compare the two options.", tr: "İki seçeneği karşılaştıralım." },
  { en: "This solution looks more practical.", tr: "Bu çözüm daha uygulanabilir görünüyor." },
  { en: "I need to check this with my manager.", tr: "Bunu yöneticimle kontrol etmem gerekiyor." },
  { en: "I'll discuss this with the Chief Engineer.", tr: "Bunu Chief Engineer ile görüşeceğim." },
  { en: "I'll get back to you after I check it.", tr: "Kontrol ettikten sonra size dönüş yapacağım." }
];

async function createBusinessEnglish() {
  console.log('🚀 Creating "İş ve Toplantı İngilizcesi" module...');

  // 1. Create or Find Class
  const className = 'İş ve Toplantı İngilizcesi';
  const classSlug = 'is-ve-toplanti-ingilizcesi';

  const { data: existingClass } = await supabase
    .from('classes')
    .select('id, slug')
    .ilike('name', className)
    .maybeSingle();

  let classId = existingClass?.id;

  const moduleDescObj = {
    description: "Mercedes, uluslararası ekipler ve toplantılar için profesyonel iş İngilizcesi ve kalıplar.",
    badge: "İş Dünyası",
    icon: "💼",
    theme: "purple",
    tagline: "Workplace, Meetings & Mercedes Context",
    isUnlisted: true // Default: Unlisted (accessible via link, hidden from public home list)
  };
  const moduleDescJson = JSON.stringify(moduleDescObj);

  if (!classId) {
    const { data: newClass, error: classErr } = await supabase
      .from('classes')
      .insert({
        name: className,
        slug: classSlug,
        description: moduleDescJson,
        order_index: 99
      })
      .select()
      .single();

    if (classErr) throw classErr;
    classId = newClass.id;
    console.log('✓ Created Module:', className, `(${classId})`);
  } else {
    // Update metadata
    await supabase
      .from('classes')
      .update({ description: moduleDescJson })
      .eq('id', classId);
    console.log('✓ Existing Module updated with unlisted metadata:', classId);
  }

  // 2. Create or Find Folder: "Toplantı & İş Dünyası"
  const folderName = 'Toplantı & İş Dünyası';
  const { data: existingFolder } = await supabase
    .from('folders')
    .select('id')
    .eq('class_id', classId)
    .eq('name', folderName)
    .maybeSingle();

  let folderId = existingFolder?.id;

  if (!folderId) {
    const { data: newFolder, error: folderErr } = await supabase
      .from('folders')
      .insert({
        class_id: classId,
        name: folderName,
        slug: generateSlug(folderName),
        order_index: 1
      })
      .select()
      .single();

    if (folderErr) throw folderErr;
    folderId = newFolder.id;
    console.log('✓ Created Folder:', folderName, `(${folderId})`);
  } else {
    console.log('✓ Found Folder:', folderName, `(${folderId})`);
  }

  // 3. Helper to create a Story-Format Set
  async function createStorySet(title, subtitle, items, orderIndex) {
    console.log(`\nCreating Set: "${title}" (${items.length} items)...`);

    // Clean existing set with same title in this folder
    const { data: oldSets } = await supabase
      .from('sets')
      .select('id')
      .eq('folder_id', folderId)
      .eq('title', title);

    if (oldSets && oldSets.length > 0) {
      for (const old of oldSets) {
        await supabase.from('set_cards').delete().eq('set_id', old.id);
        await supabase.from('sets').delete().eq('id', old.id);
      }
      console.log(`  Cleaned old instance of "${title}"`);
    }

    const setSlug = generateSlug(title);
    const storyDesc = `${subtitle}\n---STORY_META---\n${JSON.stringify({ isStory: true, subtitle })}`;

    const { data: newSet, error: setErr } = await supabase
      .from('sets')
      .insert({
        folder_id: folderId,
        title,
        slug: setSlug,
        description: storyDesc,
        is_published: true,
        order_index: orderIndex
      })
      .select()
      .single();

    if (setErr) throw setErr;

    // Insert Cards
    const cardsPayload = items.map((item, idx) => ({
      set_id: newSet.id,
      english_text: item.en,
      turkish_text: item.tr,
      order_index: idx + 1
    }));

    const { error: cardErr } = await supabase
      .from('set_cards')
      .insert(cardsPayload);

    if (cardErr) throw cardErr;

    console.log(`  ✅ Created Set: "${title}" -> Slug: /set/${setSlug} (${items.length} cards)`);
    return { title, slug: setSlug, count: items.length };
  }

  // Create the 4 Sets
  const s1 = await createStorySet('1. Temel İş ve Toplantı Kelimeleri', 'Temel iş, operasyon ve toplantı kelimeleri (Workplace Vocabulary)', SET_1_WORDS, 1);
  const s2 = await createStorySet('2. İş ve Toplantı Kalıpları', 'Toplantılarda akıcı konuşmayı sağlayan profesyonel kalıplar (Useful Collocations)', SET_2_COLLOCATIONS, 2);
  const s3 = await createStorySet('3. Hazır Toplantı İfadeleri', 'Toplantıya başlama, soru sorma ve kilit durumları kurtarma (Meeting English)', SET_3_MEETINGS, 3);
  const s4 = await createStorySet('4. Gerçek İş ve Toplantı Senaryoları', 'Mercedes, Çin ekibi ve Chief Engineer ile gerçek senaryolar (Real Work Situations)', SET_4_SITUATIONS, 4);

  console.log('\n======================================================');
  console.log('🎉 ALL 4 BUSINESS ENGLISH SETS CREATED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(`Module URL: https://ziya-baran-akademi.vercel.app/module/${classSlug}`);
  console.log(`Set 1: https://ziya-baran-akademi.vercel.app/set/${s1.slug} (${s1.count} kelime)`);
  console.log(`Set 2: https://ziya-baran-akademi.vercel.app/set/${s2.slug} (${s2.count} kalıp)`);
  console.log(`Set 3: https://ziya-baran-akademi.vercel.app/set/${s3.slug} (${s3.count} ifade)`);
  console.log(`Set 4: https://ziya-baran-akademi.vercel.app/set/${s4.slug} (${s4.count} cümle)`);
}

createBusinessEnglish().catch(console.error);
