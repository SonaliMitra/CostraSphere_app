import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TERRAIN_MULTIPLIERS: Record<string, number> = {
  urban: 1.0,
  rural: 1.2,
  mountain: 1.6,
  forest: 1.4,
};

const LABOR_MULTIPLIERS: Record<string, number> = {
  skilled: 1.3,
  unskilled: 0.8,
};

// Realistic Indian telecom costs in INR
const TOWER_COST_PER_UNIT = 250000;       // 2.5L per tower installation
const TOWER_EQUIPMENT_COST = 50000;       // 50K equipment per tower
const FIBER_COST_PER_KM_BASE = 55000;     // 55K per km fiber (mid-range)
const CONNECTOR_COST_PER_TOWER = 15000;   // 15K connectors per tower
const TRANSPORT_BASE = 25000;             // 25K base transport
const TRANSPORT_PER_KM = 500;             // 500 per km additional transport
const MAINTENANCE_PERCENT = 0.08;         // 8% of deployment cost
const DAILY_WAGE_SKILLED = 1800;          // 1800/day skilled
const DAILY_WAGE_UNSKILLED = 800;         // 800/day unskilled

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTerrainFromMultiplier(multiplier: number): string {
  if (multiplier >= 2.0) return "mountain";
  if (multiplier >= 1.4) return "forest";
  if (multiplier >= 1.15) return "rural";
  return "urban";
}

async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string; country: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
      { headers: { "User-Agent": "CostraSphere-AI/1.0" } }
    );
    const data = await res.json();
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || addr.county || addr.state_district || "",
      state: addr.state || "",
      country: addr.country || "",
    };
  } catch {
    return null;
  }
}

function generateNearbyTowers(lat: number, lng: number, radius: number, density: number): any[] {
  const towers: any[] = [];
  const count = Math.max(3, Math.min(25, Math.round(density * 0.5 + 3)));
  const rng = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    const angle = rng(lat * 1000 + i * 137.5) * 2 * Math.PI;
    const dist = (rng(lng * 1000 + i * 251.3) * 0.7 + 0.3) * radius;
    const dLat = (dist / 111) * Math.cos(angle);
    const dLng = (dist / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
    const towerLat = lat + dLat;
    const towerLng = lng + dLng;
    const towerDist = haversineDistance(lat, lng, towerLat, towerLng);
    const towerType = i < count * 0.3 ? "macro" : i < count * 0.7 ? "micro" : "small_cell";
    towers.push({
      id: `tower-${i}`,
      latitude: Math.round(towerLat * 10000) / 10000,
      longitude: Math.round(towerLng * 10000) / 10000,
      distance_km: Math.round(towerDist * 10) / 10,
      type: towerType,
      radius_m: towerType === "macro" ? 3000 : towerType === "micro" ? 1000 : 300,
      estimated_cost: towerType === "macro" ? 250000 : towerType === "micro" ? 80000 : 30000,
    });
  }
  return towers.sort((a, b) => a.distance_km - b.distance_km);
}

function generateConnectionNodes(lat: number, lng: number, towers: any[]): any[] {
  const nodes: any[] = [];
  const mainHub = { id: "node-hub", latitude: lat, longitude: lng, type: "main_hub", label: "Central Office" };
  nodes.push(mainHub);

  const junctionCount = Math.min(5, Math.max(2, Math.floor(towers.length / 3)));
  for (let i = 0; i < junctionCount; i++) {
    const t1 = towers[i * 2] || towers[0];
    const t2 = towers[i * 2 + 1] || towers[towers.length - 1];
    const jLat = (t1.latitude + t2.latitude) / 2 + (Math.sin(i * 1.7) * 0.005);
    const jLng = (t1.longitude + t2.longitude) / 2 + (Math.cos(i * 2.3) * 0.005);
    nodes.push({
      id: `node-junction-${i}`,
      latitude: Math.round(jLat * 10000) / 10000,
      longitude: Math.round(jLng * 10000) / 10000,
      type: "junction",
      label: `Distribution Point ${i + 1}`,
    });
  }
  return nodes;
}

function getAISuggestions(params: Record<string, number | string>): string[] {
  const suggestions: string[] = [];
  const { terrain, tower_count, fiber_length_km, labor_type, total_project_cost } = params;

  if (terrain === "mountain") {
    suggestions.push("Mountain terrain increases costs by 60%. Consider microwave backhaul as an alternative to fiber in remote areas.");
  }
  if (terrain === "forest") {
    suggestions.push("Forest terrain requires additional clearing and environmental permits. Budget 15-20% extra for compliance.");
  }
  if (Number(tower_count) > 20) {
    suggestions.push("Large tower deployments benefit from bulk material procurement. Negotiate volume discounts with suppliers.");
  }
  if (Number(fiber_length_km) > 50) {
    suggestions.push("For long fiber runs, consider using existing utility poles or rights-of-way to reduce trenching costs by up to 40%.");
  }
  if (labor_type === "unskilled") {
    suggestions.push("Unskilled labor reduces costs but may increase project timeline. Consider a mixed team with 30% skilled supervisors.");
  }
  if (Number(total_project_cost) > 10000000) {
    suggestions.push("High-value projects should include a 10-15% contingency budget for unforeseen challenges.");
  }
  if (Number(tower_count) <= 5 && Number(fiber_length_km) <= 10) {
    suggestions.push("Small-scale deployment detected. Consider a phased approach to validate costs before scaling.");
  }
  suggestions.push("Regular maintenance scheduling can extend infrastructure lifespan by 30-40%.");
  suggestions.push("Consider 5G small cell deployment in urban areas to complement macro tower coverage.");
  return suggestions;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { latitude, longitude, tower_count, fiber_length_km, labor_type, search_radius } = await req.json();

    if (latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: "Latitude and longitude are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Reverse geocode the user's location
    const geocoded = await reverseGeocode(latitude, longitude);

    // Fetch all city cost data
    const { data: cityCosts, error } = await supabase
      .from("city_costs")
      .select("*")
      .gt("latitude", 0)
      .gt("longitude", 0);

    if (error || !cityCosts || cityCosts.length === 0) {
      return new Response(JSON.stringify({ error: "No city cost data available" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find nearest city by haversine distance
    let nearestCity = cityCosts[0];
    let minDistance = haversineDistance(latitude, longitude, cityCosts[0].latitude, cityCosts[0].longitude);

    // Also try to match by city name from reverse geocoding
    let matchedCity: any = null;
    if (geocoded && geocoded.city) {
      const cityName = geocoded.city.toLowerCase();
      matchedCity = cityCosts.find((c: any) =>
        c.city.toLowerCase() === cityName ||
        c.city.toLowerCase().includes(cityName) ||
        cityName.includes(c.city.toLowerCase())
      );
    }

    const nearbyCities: any[] = [];
    const NEARBY_RADIUS_KM = search_radius || 100;

    for (const city of cityCosts) {
      const dist = haversineDistance(latitude, longitude, city.latitude, city.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestCity = city;
      }
      if (dist <= NEARBY_RADIUS_KM) {
        nearbyCities.push({ ...city, distance_km: Math.round(dist * 10) / 10 });
      }
    }

    nearbyCities.sort((a, b) => a.distance_km - b.distance_km);

    // Use matched city if found and closer than 50km, otherwise use nearest
    const bestCity = matchedCity && haversineDistance(latitude, longitude, matchedCity.latitude, matchedCity.longitude) < 50
      ? matchedCity : nearestCity;

    const terrain = getTerrainFromMultiplier(bestCity.terrain_multiplier);
    const terrainMultiplier = TERRAIN_MULTIPLIERS[terrain] ?? 1.0;
    const laborMultiplier = LABOR_MULTIPLIERS[labor_type || "skilled"] ?? 1.0;

    const tCount = tower_count || 5;
    const fLength = fiber_length_km || 10;

    // Realistic cost calculations in INR
    const towerCost = (TOWER_COST_PER_UNIT + TOWER_EQUIPMENT_COST) * tCount * terrainMultiplier;
    const fiberCost = (bestCity.fiber_per_km || FIBER_COST_PER_KM_BASE) * fLength * terrainMultiplier;
    const laborCost = (bestCity.labor_per_km || 9000) * fLength * laborMultiplier * terrainMultiplier;
    const materialCost = CONNECTOR_COST_PER_TOWER * tCount * 4 + fLength * 1500;
    const deploymentCost = towerCost + fiberCost + laborCost + materialCost;
    const maintenanceCost = deploymentCost * MAINTENANCE_PERCENT;
    const transportCost = (TRANSPORT_BASE + TRANSPORT_PER_KM * fLength) * terrainMultiplier;

    const workerCount = Math.max(3, Math.ceil(tCount * 1.5 + fLength * 0.3));
    const dailyWage = (labor_type || "skilled") === "skilled" ? DAILY_WAGE_SKILLED : DAILY_WAGE_UNSKILLED;
    const estimatedDays = Math.max(10, Math.ceil(tCount * 3 + fLength * 1.5));
    const salaryCost = workerCount * dailyWage * estimatedDays;

    const totalProjectCost = towerCost + fiberCost + laborCost + materialCost + maintenanceCost + transportCost + salaryCost;

    const towerDensity = nearbyCities.length > 0
      ? Math.round((nearbyCities.length / (Math.PI * NEARBY_RADIUS_KM * NEARBY_RADIUS_KM)) * 10000) / 10
      : 0.5;

    // Generate nearby towers
    const nearbyTowers = generateNearbyTowers(latitude, longitude, 30, towerDensity);

    // Generate connection nodes
    const connectionNodes = generateConnectionNodes(latitude, longitude, nearbyTowers);

    const suggestions = getAISuggestions({
      terrain,
      tower_count: tCount,
      fiber_length_km: fLength,
      labor_type: labor_type || "skilled",
      total_project_cost: totalProjectCost,
    });

    const result = {
      location: {
        latitude,
        longitude,
        detected_city: geocoded?.city || "",
        detected_state: geocoded?.state || "",
        detected_country: geocoded?.country || "",
      },
      nearest_city: {
        name: bestCity.city,
        state: bestCity.state,
        country: bestCity.country,
        latitude: bestCity.latitude,
        longitude: bestCity.longitude,
        distance_km: Math.round(haversineDistance(latitude, longitude, bestCity.latitude, bestCity.longitude) * 10) / 10,
        currency: bestCity.currency,
        currency_symbol: bestCity.currency_symbol,
      },
      terrain,
      terrain_multiplier: bestCity.terrain_multiplier,
      tower_density: towerDensity,
      cost_breakdown: {
        material_cost: Math.round(materialCost),
        labor_cost: Math.round(laborCost),
        tower_cost: Math.round(towerCost),
        fiber_cost: Math.round(fiberCost),
        maintenance_cost: Math.round(maintenanceCost),
        transport_cost: Math.round(transportCost),
        salary_cost: Math.round(salaryCost),
      },
      worker_count: workerCount,
      estimated_days: estimatedDays,
      total_project_cost: Math.round(totalProjectCost),
      nearby_cities: nearbyCities.slice(0, 20),
      nearby_towers: nearbyTowers,
      connection_nodes: connectionNodes,
      suggestions,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
