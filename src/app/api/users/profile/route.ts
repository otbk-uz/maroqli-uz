import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { findLocalUser, upsertLocalUser, getAllLocalUsers } from '@/lib/localAuth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const queryUsername = searchParams.get('username');

    // Also check Authorization header
    const authHeader = req.headers.get('authorization') || '';
    let tokenUser: any = null;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          tokenUser = payload;
        }
      } catch (e) {
        // invalid token
      }
    }

    const targetId = queryId || tokenUser?.sub || tokenUser?.id;
    const targetUsername = queryUsername || tokenUser?.username;

    // 1. Check Supabase profiles table using supabaseAdmin (bypassing RLS)
    if (targetId) {
      try {
        const { data: supaProfile, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        if (supaProfile && !error) {
          return NextResponse.json({
            success: true,
            profile: supaProfile,
          });
        }
      } catch (err) {
        console.warn("SupabaseAdmin profile fetch error:", err);
      }
    }

    if (targetUsername) {
      try {
        const { data: supaProfile, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .ilike('username', targetUsername)
          .maybeSingle();

        if (supaProfile && !error) {
          return NextResponse.json({
            success: true,
            profile: supaProfile,
          });
        }
      } catch (err) {
        console.warn("SupabaseAdmin profile username fetch error:", err);
      }
    }

    // 2. Check local database
    if (targetId || targetUsername) {
      let local = targetId ? await findLocalUser(String(targetId)) : undefined;
      if (!local && targetUsername) {
        local = await findLocalUser(String(targetUsername));
      }

      if (local) {
        const profile = {
          id: local.id,
          username: local.username,
          full_name: local.full_name,
          email: local.email,
          phone_number: local.phone_number,
          role: local.role || 'VIEWER',
          avatar_url: local.avatar_url || null,
          coins: local.coins || 50,
          elo: 1000,
          level: 1,
          is_premium: local.is_premium || false,
          created_at: local.created_at || new Date().toISOString(),
        };

        // Try to background sync to profiles with supabaseAdmin
        try {
          await supabaseAdmin.from('profiles').upsert({
            id: local.id,
            email: local.email,
            username: local.username,
            full_name: local.full_name,
            role: local.role || 'VIEWER',
            avatar_url: local.avatar_url,
            phone_number: local.phone_number,
            coins: local.coins || 50,
            created_at: local.created_at,
          });
        } catch {
          // ignore
        }

        return NextResponse.json({
          success: true,
          profile,
        });
      }
    }

    // 3. Fallback to token information if available
    if (tokenUser) {
      return NextResponse.json({
        success: true,
        profile: {
          id: tokenUser.sub || tokenUser.id,
          username: tokenUser.username || "user",
          full_name: tokenUser.full_name || tokenUser.username || "Foydalanuvchi",
          email: tokenUser.email || "",
          role: tokenUser.role || "VIEWER",
          avatar_url: tokenUser.avatar || null,
          coins: 50,
          elo: 1000,
          level: 1,
          is_premium: false,
          created_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: "Profil topilmadi." },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("GET /api/users/profile error:", err);
    return NextResponse.json(
      { error: err.message || "Profilni yuklashda xatolik yuz berdi." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, full_name, username, role, avatar_url, phone_number } = body;

    if (!id && !username) {
      return NextResponse.json(
        { error: "Foydalanuvchi identifikatori ko'rsatilmagan." },
        { status: 400 }
      );
    }

    // 1. Update in local store
    let updatedLocal = null;
    const existing = await findLocalUser(username || id);
    if (existing) {
      existing.full_name = full_name || existing.full_name;
      existing.username = username || existing.username;
      if (role) existing.role = role;
      if (avatar_url !== undefined) existing.avatar_url = avatar_url;
      if (phone_number !== undefined) existing.phone_number = phone_number;

      await upsertLocalUser(existing);
      updatedLocal = existing;
    }

    // 2. Update in Supabase profiles
    try {
      const updatePayload: Record<string, any> = {
        last_seen: new Date().toISOString(),
      };
      if (full_name) updatePayload.full_name = full_name;
      if (username) updatePayload.username = username;
      if (role) updatePayload.role = role;
      if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;
      if (phone_number !== undefined) updatePayload.phone_number = phone_number;

      if (id) {
        await supabaseAdmin.from('profiles').update(updatePayload).eq('id', id);
      } else if (username) {
        await supabaseAdmin.from('profiles').update(updatePayload).eq('username', username);
      }
    } catch (supaErr) {
      console.warn("Supabase profiles update notice:", supaErr);
      try {
        const updatePayload: Record<string, any> = {
          last_seen: new Date().toISOString(),
        };
        if (full_name) updatePayload.full_name = full_name;
        if (username) updatePayload.username = username;
        if (role) updatePayload.role = role;
        if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;
        if (phone_number !== undefined) updatePayload.phone_number = phone_number;

        if (id) {
          await supabase.from('profiles').update(updatePayload).eq('id', id);
        } else if (username) {
          await supabase.from('profiles').update(updatePayload).eq('username', username);
        }
      } catch (fallbackErr) {
        console.warn("Fallback Supabase profiles update:", fallbackErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profil muvaffaqiyatli saqlandi.",
      profile: updatedLocal || {
        id,
        full_name,
        username,
        role: role || 'VIEWER',
        avatar_url,
      },
    });
  } catch (err: any) {
    console.error("PUT /api/users/profile error:", err);
    return NextResponse.json(
      { error: err.message || "Profilni saqlashda xatolik yuz berdi." },
      { status: 500 }
    );
  }
}
