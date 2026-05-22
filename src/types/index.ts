export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'admin' | 'developer';
  company_name: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  project_name: string;
  country: string;
  city: string;
  tower_count: number;
  fiber_length_km: number;
  terrain: string;
  labor_type: string;
  estimated_days: number;
  worker_count: number;
  total_salary_cost: number;
  total_material_cost: number;
  total_project_cost: number;
  status: string;
  latitude: number;
  longitude: number;
  nearest_city: string;
  tower_density: number;
  created_at: string;
}

export interface CostBreakdown {
  id: string;
  project_id: string;
  material_cost: number;
  labor_cost: number;
  tower_cost: number;
  fiber_cost: number;
  maintenance_cost: number;
  transport_cost: number;
}

export interface ChatMessage {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

export interface AIEstimation {
  nearest_city: {
    name: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    distance_km: number;
    currency: string;
    currency_symbol: string;
  };
  terrain: string;
  terrain_multiplier: number;
  tower_density: number;
  cost_breakdown: {
    material_cost: number;
    labor_cost: number;
    tower_cost: number;
    fiber_cost: number;
    maintenance_cost: number;
    transport_cost: number;
    salary_cost: number;
  };
  worker_count: number;
  estimated_days: number;
  total_project_cost: number;
  nearby_cities: NearbyCity[];
  suggestions: string[];
}

export interface NearbyCity {
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  fiber_per_km: number;
  labor_per_km: number;
  terrain_multiplier: number;
  currency: string;
  currency_symbol: string;
}

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
}
