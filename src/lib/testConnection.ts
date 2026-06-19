import { supabase } from "./supabase";

export async function testConnection() {
  const { data, error } = await supabase
    .from("vendors")
    .select("*");

  console.log("DATA:", data);
  console.log("ERROR:", error);
}