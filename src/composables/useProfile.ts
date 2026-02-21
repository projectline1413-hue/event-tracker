import { supabase } from "../lib/supabase";

export async function getOrCreateProfile(
  lineUserId: string,
  displayName: string,
  pictureUrl: string | null,
) {
  // 1. ตรวจสอบว่าใน Supabase Auth มี User นี้หรือยัง (ใช้ line_user_id ผูกกับ metadata)
  // แต่ในระบบนี้เราเน้นใช้ profiles table เป็นหลัก
  // เราจะเช็ค session ของ supabase ก่อนถ้ามีอยู่แล้ว
  const { data: sessionData } = await supabase.auth.getSession();
  let userId = sessionData?.session?.user?.id;

  // 2. ถ้าไม่มี Supabase Session ให้ "จำลอง" หรือใช้ข้อมูลจาก LIFF สร้าง Profile
  // หมายเหตุ: ใน Flow นี้ LIFF เป็นตัวยืนยันตนหลัก
  
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl,
        // ถ้ามี userId จาก auth ให้ใส่ไปด้วย ถ้าไม่มีให้ใช้ระบบสร้าง UUID อัตโนมัติ (RLS ต้องรองรับ)
        ...(userId && { user_id: userId })
      },
      { onConflict: "line_user_id" },
    )
    .select()
    .single();

  if (error) {
    console.error("Profile Upsert Error:", error);
    throw error;
  }
  
  return data;
}
