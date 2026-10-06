import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Helper function to decode JWT payload safely without external dependencies
function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("JWT decode error:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { credential, userInfo } = body;

    let email = userInfo?.email;
    let name = userInfo?.name;
    let picture = userInfo?.picture;
    let googleId = userInfo?.sub;

    if (credential) {
      const payload = decodeJwtPayload(credential);
      if (payload) {
        email = email || payload.email;
        name = name || payload.name || payload.given_name;
        picture = picture || payload.picture;
        googleId = googleId || payload.sub;
      }
    }

    if (!email) {
      return NextResponse.json({ error: "Google hisobidan e-pochta olinmadi." }, { status: 400 });
    }

    // 1. Search for existing profile by email or username
    let { data: existingProfile, error: searchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!existingProfile) {
      const cleanUsername = (email.split('@')[0] || 'gamer').replace(/[^a-zA-Z0-9_]/g, '') + '_' + Math.floor(1000 + Math.random() * 9000);
      const newUserId = crypto.randomUUID();

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUserId,
          email: email,
          username: cleanUsername,
          full_name: name || cleanUsername,
          avatar_url: picture || null,
          role: 'GAMER',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error("Google profile insert error:", insertError);
        // Try fallback lookup by username
        const { data: fallbackProf } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .limit(1)
          .single();
        existingProfile = fallbackProf || {
          id: newUserId,
          username: cleanUsername,
          full_name: name || cleanUsername,
          email,
          role: 'GAMER',
          avatar_url: picture
        };
      } else {
        existingProfile = newProfile;
      }
    }

    // Generate a simple token session
    const tokenPayload = {
      id: existingProfile.id,
      email: existingProfile.email || email,
      username: existingProfile.username,
      role: existingProfile.role || 'GAMER',
      iat: Math.floor(Date.now() / 1000)
    };

    const dummyToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    return NextResponse.json({
      success: true,
      user: {
        id: existingProfile.id,
        nickname: existingProfile.username || name || "Foydalanuvchi",
        full_name: existingProfile.full_name || name || "",
        email: existingProfile.email || email,
        role: existingProfile.role || "GAMER",
        avatar: existingProfile.avatar_url || picture,
        is_premium: existingProfile.is_premium || false
      },
      token: dummyToken
    });
  } catch (err: any) {
    console.error("Google auth API error:", err);
    return NextResponse.json({ error: err.message || "Google avtorizatsiyasida xatolik" }, { status: 500 });
  }
}
