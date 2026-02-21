import { supabase } from "../lib/supabase";

export async function getPosterData(userId: string, eventId: string) {
  // profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, picture_url, team_id")
    .eq("id", userId)
    .single();

  // team
  let team = null;
  if (profile?.team_id) {
    const { data: teamData } = await supabase
      .from("teams")
      .select("team_name")
      .eq("id", profile.team_id)
      .single();

    team = teamData;
  }

  // runs
  const { data: runs } = await supabase
    .from("runs")
    .select("distance_km, created_at")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const latestDistance = runs?.[0]?.distance_km ?? 0;
  const totalPersonal =
    runs?.reduce((sum, r) => sum + Number(r.distance_km), 0) ?? 0;

  // team total
  let totalTeam = 0;
  if (profile?.team_id) {
    const { data: teamRuns } = await supabase
      .from("runs")
      .select("distance_km, profiles!inner(team_id)")
      .eq("event_id", eventId)
      .eq("profiles.team_id", profile.team_id)
      .eq("status", "approved");

    totalTeam =
      teamRuns?.reduce((sum, r) => sum + Number(r.distance_km), 0) ?? 0;
  }

  return {
    profile,
    team,
    stats: {
      latest_distance: latestDistance,
      total_personal: totalPersonal,
      total_team: totalTeam,
    },
  };
}
