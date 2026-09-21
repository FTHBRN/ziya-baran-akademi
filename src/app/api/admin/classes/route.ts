import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function slugify(text: string) {
  const trMap: { [key: string]: string } = {
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

export async function GET() {
  try {
    const { data: classes, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('*, folders(*, sets(*), manual_tests(*), stories(*))')
      .order('order_index', { ascending: true });

    if (classErr) throw classErr;
    return NextResponse.json({ classes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, name, description, class_id, order_index } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'İsim zorunludur' }, { status: 400 });
    }

    const slug = slugify(name);

    if (type === 'class' || type === 'module') {
      // Find highest order_index to place at end if not provided
      let targetOrder = order_index;
      if (typeof targetOrder !== 'number') {
        const { data: lastClass } = await supabaseAdmin
          .from('classes')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1)
          .single();
        targetOrder = (lastClass?.order_index || 0) + 1;
      }

      const { data, error } = await supabaseAdmin
        .from('classes')
        .insert({
          name: name.trim(),
          slug,
          description: description || null,
          order_index: targetOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: data });
    } else if (type === 'folder') {
      if (!class_id) {
        return NextResponse.json({ error: 'class_id zorunludur' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('folders')
        .insert({
          class_id,
          name: name.trim(),
          slug,
          order_index: order_index || 99,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, item: data });
    }

    return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 });
  } catch (error: any) {
    console.error('Classes POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // 1. Batch reorder operation
    if (body.reorder && Array.isArray(body.reorder)) {
      for (const item of body.reorder) {
        if (item.id && typeof item.order_index === 'number') {
          await supabaseAdmin
            .from('classes')
            .update({ order_index: item.order_index })
            .eq('id', item.id);
        }
      }
      return NextResponse.json({ success: true, message: 'Sıralama güncellendi' });
    }

    // 2. Single module update
    const { id, name, description, order_index } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID gereklidir' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (name && name.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (typeof order_index === 'number') updates.order_index = order_index;

    const { data, error } = await supabaseAdmin
      .from('classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    console.error('Classes PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'class';

    if (!id) {
      return NextResponse.json({ error: 'ID zorunludur' }, { status: 400 });
    }

    if (type === 'class' || type === 'module') {
      // Check if folders exist
      const { data: folders } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('class_id', id);

      if (folders && folders.length > 0) {
        // Unassign folders or reassign to general to prevent orphaned contents
        const { data: generalClass } = await supabaseAdmin
          .from('classes')
          .select('id')
          .ilike('name', '%genel%')
          .limit(1)
          .single();

        if (generalClass && generalClass.id !== id) {
          await supabaseAdmin
            .from('folders')
            .update({ class_id: generalClass.id })
            .eq('class_id', id);
        }
      }

      const { error } = await supabaseAdmin.from('classes').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ success: true });
    } else if (type === 'folder') {
      const { error } = await supabaseAdmin.from('folders').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Geçersiz silme tipi' }, { status: 400 });
  } catch (error: any) {
    console.error('Classes DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
