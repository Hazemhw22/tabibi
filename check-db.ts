import { supabaseAdmin } from "./src/lib/supabase-admin";

async function checkData() {
  console.log("--- Checking Specialties ---");
  const { data: specs } = await supabaseAdmin.from("Specialty").select("id, nameAr").limit(5);
  console.log("Specialties found:", specs);

  console.log("\n--- Checking Doctors ---");
  const { data: docs } = await supabaseAdmin.from("Doctor").select("id, status, visibleToPatients, locationId").limit(5);
  console.log("Doctors found:", docs);

  console.log("\n--- Checking Locations used by Doctors ---");
  const { data: locations } = await supabaseAdmin.from("Doctor").select("locationId");
  const uniqueLocations = [...new Set(locations?.map(l => l.locationId))];
  console.log("Unique Location IDs in DB:", uniqueLocations);
}

checkData();
