import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_jwt";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verify(token, JWT_SECRET) as { id: string };

    const { name, image } = await req.json();

    let imageUrl = image;

    // If image is a base64 string, upload to Supabase Storage
    if (image && image.startsWith("data:image")) {
      try {
        const base64Data = image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `${decoded.id}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("avatars")
          .upload(fileName, buffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicData } = supabaseAdmin.storage
            .from("avatars")
            .getPublicUrl(fileName);
          imageUrl = publicData.publicUrl;
        } else {
          console.error("Upload error:", uploadError);
        }
      } catch (err) {
        console.error("Image processing error:", err);
      }
    }

    const { data: user, error } = await supabaseAdmin
      .from("User")
      .update({ 
        name: name || undefined, 
        image: imageUrl || undefined 
      })
      .eq("id", decoded.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
