import { supabase } from './supabase';

interface CityCostData {
  country: string;
  city: string;
  fiber_per_km: number;
  labor_per_km: number;
  connector_cost: number;
  maintenance_per_km: number;
  terrain_multiplier: number;
  currency: string;
  currency_symbol: string;
}

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

const TOWER_BASE_COST = 500000;
const TOWER_INSTALL_COST = 150000;

export interface CostEstimate {
  material_cost: number;
  labor_cost: number;
  tower_cost: number;
  fiber_cost: number;
  maintenance_cost: number;
  transport_cost: number;
  salary_cost: number;
  worker_count: number;
  estimated_days: number;
  total_project_cost: number;
  city_data: CityCostData | null;
}

export async function calculateCosts(params: {
  country: string;
  city: string;
  tower_count: number;
  fiber_length_km: number;
  terrain: string;
  labor_type: string;
}): Promise<CostEstimate> {
  const { country, city, tower_count, fiber_length_km, terrain, labor_type } = params;

  const { data: cityRows } = await supabase
    .from('city_costs')
    .select('*')
    .ilike('country', country)
    .ilike('city', city)
    .limit(1)
    .maybeSingle();

  const cityData = cityRows as CityCostData | null;

  const fiberPerKm = cityData?.fiber_per_km ?? 45000;
  const laborPerKm = cityData?.labor_per_km ?? 9000;
  const connectorCost = cityData?.connector_cost ?? 1200;
  const maintenancePerKm = cityData?.maintenance_per_km ?? 5000;
  const baseTerrainMultiplier = cityData?.terrain_multiplier ?? 1.0;

  const terrainMultiplier = TERRAIN_MULTIPLIERS[terrain] ?? 1.0;
  const laborMultiplier = LABOR_MULTIPLIERS[labor_type] ?? 1.0;
  const effectiveMultiplier = baseTerrainMultiplier * terrainMultiplier;

  const towerCost = (TOWER_BASE_COST + TOWER_INSTALL_COST) * tower_count * effectiveMultiplier;
  const fiberCost = fiberPerKm * fiber_length_km * effectiveMultiplier;
  const laborCost = laborPerKm * fiber_length_km * laborMultiplier * effectiveMultiplier;
  const materialCost = connectorCost * tower_count * 4 + fiber_length_km * 2000;
  const maintenanceCost = maintenancePerKm * fiber_length_km * 0.1;
  const transportCost = (tower_count * 50000 + fiber_length_km * 3000) * effectiveMultiplier;

  const workerCount = Math.max(5, Math.ceil(tower_count * 2 + fiber_length_km * 0.5));
  const dailyWage = labor_type === 'skilled' ? 2500 : 1500;
  const estimatedDays = Math.max(15, Math.ceil(tower_count * 5 + fiber_length_km * 2));
  const salaryCost = workerCount * dailyWage * estimatedDays;

  const totalProjectCost =
    towerCost + fiberCost + laborCost + materialCost + maintenanceCost + transportCost + salaryCost;

  return {
    material_cost: Math.round(materialCost),
    labor_cost: Math.round(laborCost),
    tower_cost: Math.round(towerCost),
    fiber_cost: Math.round(fiberCost),
    maintenance_cost: Math.round(maintenanceCost),
    transport_cost: Math.round(transportCost),
    salary_cost: Math.round(salaryCost),
    worker_count: workerCount,
    estimated_days: estimatedDays,
    total_project_cost: Math.round(totalProjectCost),
    city_data: cityData,
  };
}

export function getAISuggestions(params: {
  tower_count: number;
  fiber_length_km: number;
  terrain: string;
  labor_type: string;
  total_project_cost: number;
}): string[] {
  const suggestions: string[] = [];

  if (params.terrain === 'mountain') {
    suggestions.push('Mountain terrain significantly increases costs. Consider microwave backhaul as an alternative to fiber in remote areas.');
  }
  if (params.terrain === 'forest') {
    suggestions.push('Forest terrain requires additional clearing and environmental permits. Budget 15-20% extra for compliance.');
  }
  if (params.tower_count > 20) {
    suggestions.push('Large tower deployments benefit from bulk material procurement. Negotiate volume discounts with suppliers.');
  }
  if (params.fiber_length_km > 50) {
    suggestions.push('For long fiber runs, consider using existing utility poles or rights-of-way to reduce trenching costs by up to 40%.');
  }
  if (params.labor_type === 'unskilled') {
    suggestions.push('Unskilled labor reduces costs but may increase project timeline. Consider a mixed team with 30% skilled supervisors.');
  }
  if (params.total_project_cost > 50000000) {
    suggestions.push('High-value projects should include a 10-15% contingency budget for unforeseen challenges.');
  }
  if (params.tower_count <= 5 && params.fiber_length_km <= 10) {
    suggestions.push('Small-scale deployment detected. Consider a phased approach to validate costs before scaling.');
  }
  suggestions.push('Regular maintenance scheduling can extend infrastructure lifespan by 30-40%.');
  suggestions.push('Consider 5G small cell deployment in urban areas to complement macro tower coverage.');

  return suggestions;
}

export function generateChatResponse(message: string): string {
  const m = message.toLowerCase();

  if (m.includes('cost') || m.includes('price') || m.includes('budget') || m.includes('expensive')) {
    return 'To estimate project costs, provide details like location, tower count, fiber distance, and terrain type. Our AI engine uses real city-level cost data from 800+ cities across India, Japan, China, USA, and UK to give accurate predictions. Costs vary significantly by terrain - urban areas are baseline, while mountain deployments can cost 60% more.';
  }
  if (m.includes('tower') || m.includes('5g') || m.includes('cell')) {
    return 'Telecom towers are critical infrastructure for 5G and fiber deployment. Base tower cost is around $500K with $150K installation. Costs vary by terrain - urban areas are cheaper than mountains or forests. For 5G, consider small cell deployments in dense urban areas to complement macro tower coverage.';
  }
  if (m.includes('fiber') || m.includes('cable') || m.includes('optic')) {
    return 'Fiber deployment involves trenching, cable laying, and connection. Average cost ranges from 28,000 to 80,000 per km depending on location and terrain complexity. For long fiber runs, consider using existing utility poles or rights-of-way to reduce trenching costs by up to 40%.';
  }
  if (m.includes('worker') || m.includes('labor') || m.includes('team') || m.includes('staff')) {
    return 'Project workforce depends on scope. Typically, you need 5-15 workers for fiber deployment, with costs varying by skill level. Skilled labor costs 1.3x more but completes work faster. Consider a mixed team with 30% skilled supervisors for optimal cost-efficiency.';
  }
  if (m.includes('timeline') || m.includes('duration') || m.includes('days') || m.includes('long')) {
    return 'Project duration depends on fiber distance and tower count. Generally, expect 15-100 days for medium-sized deployments. Each tower takes about 5 days, and each km of fiber takes about 2 days. Mountain and forest terrain can add 20-60% to the timeline.';
  }
  if (m.includes('maintain') || m.includes('repair') || m.includes('upkeep')) {
    return 'Maintenance is critical. Budget 5,000-10,000 per km annually for fiber maintenance and tower upkeep. Regular maintenance scheduling can extend infrastructure lifespan by 30-40%. Consider predictive maintenance using IoT sensors on towers.';
  }
  if (m.includes('hello') || m.includes('hi') || m.includes('hey')) {
    return 'Hello! I am CostraSphere AI assistant. I can help you with telecom infrastructure planning, cost estimation, and project insights. Ask me about costs, towers, fiber deployment, worker requirements, or timelines.';
  }
  if (m.includes('help') || m.includes('what can')) {
    return 'I can assist with: cost estimates, project planning, timeline prediction, worker requirements, and telecom infrastructure advice. Just ask about any of these topics!';
  }
  if (m.includes('country') || m.includes('india') || m.includes('japan') || m.includes('usa') || m.includes('uk') || m.includes('china')) {
    return 'We support cost estimation for 5 countries: India (INR), Japan (JPY), China (CNY), USA (USD), and UK (GBP). Our database covers 800+ cities with real cost data including fiber per km, labor rates, and terrain multipliers. India has the most comprehensive coverage with data for all major districts.';
  }

  return 'I can help you with telecom infrastructure planning. Try asking about costs, towers, fiber deployment, worker requirements, timelines, or maintenance. What would you like to know?';
}
