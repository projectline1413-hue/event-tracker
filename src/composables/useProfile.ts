import { supabase } from "../lib/supabase";

export async function getOrCreateProfile(
  lineUserId: string,
  displayName: string,
) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("line_user_id", lineUserId)
    .single();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      line_user_id: lineUserId,
      display_name: displayName,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
