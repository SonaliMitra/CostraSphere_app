import pandas as pd
import os
from datetime import datetime, timedelta

class AICostEstimator:
    def __init__(self):
        self.data = self.load_data()
        self.terrain_multipliers = {
            "urban": 1.0,
            "rural": 1.2,
            "mountain": 1.6,
            "forest": 1.4
        }

    def load_data(self):
        csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "global_city_costs.csv")
        if os.path.exists(csv_path):
            return pd.read_csv(csv_path)
        return None

    def get_city_costs(self, country: str, city: str) -> dict:
        if self.data is None:
            return self.get_default_costs()

        result = self.data[
            (self.data['country'].str.lower() == country.lower()) &
            (self.data['city'].str.lower() == city.lower())
        ]

        if result.empty:
            return self.get_default_costs()

        row = result.iloc[0]
        return {
            "fiber_per_km": float(row.get("fiber_per_km", 40000)),
            "labor_per_km": float(row.get("labor_per_km", 8000)),
            "connector_cost": float(row.get("connector_cost", 1000)),
            "maintenance_per_km": float(row.get("maintenance_per_km", 5000)),
            "terrain_multiplier": float(row.get("terrain_multiplier", 1.0))
        }

    def get_default_costs(self) -> dict:
        return {
            "fiber_per_km": 40000,
            "labor_per_km": 8000,
            "connector_cost": 1000,
            "maintenance_per_km": 5000,
            "terrain_multiplier": 1.0
        }

    def calculate_costs(
        self,
        country: str,
        city: str,
        tower_count: int,
        fiber_distance: float,
        terrain: str,
        labor_type: str
    ) -> dict:

        city_costs = self.get_city_costs(country, city)
        terrain_mult = self.terrain_multipliers.get(terrain.lower(), 1.0)

        base_fiber_cost = city_costs["fiber_per_km"] * fiber_distance
        base_labor_cost = city_costs["labor_per_km"] * fiber_distance
        connector_cost = city_costs["connector_cost"] * tower_count
        maintenance_cost = city_costs["maintenance_per_km"] * fiber_distance

        fiber_cost = base_fiber_cost * terrain_mult
        labor_cost = base_labor_cost * terrain_mult * (1.2 if labor_type == "skilled" else 1.0)
        tower_cost = tower_count * 150000 * terrain_mult
        transport_cost = (fiber_distance * 500 + tower_count * 5000) * terrain_mult

        material_cost = fiber_cost + tower_cost + connector_cost
        total_cost = material_cost + labor_cost + maintenance_cost + transport_cost

        worker_count = max(int(fiber_distance / 5) + tower_count // 2, 5)
        salary_cost = worker_count * 25000 * (2 if labor_type == "skilled" else 1)

        base_days = int(fiber_distance / 10) + (tower_count * 3)
        estimated_days = max(base_days, 20)

        total_cost_with_salary = total_cost + salary_cost

        return {
            "worker_count": worker_count,
            "salary_cost": salary_cost,
            "material_cost": material_cost,
            "tower_cost": tower_cost,
            "fiber_cost": fiber_cost,
            "maintenance_cost": maintenance_cost,
            "transport_cost": transport_cost,
            "labor_cost": labor_cost,
            "connector_cost": connector_cost,
            "total_project_cost": total_cost_with_salary,
            "estimated_days": estimated_days,
            "cost_breakdown": {
                "material": material_cost,
                "labor": salary_cost,
                "tower": tower_cost,
                "fiber": fiber_cost,
                "maintenance": maintenance_cost,
                "transport": transport_cost
            }
        }

    def get_ai_suggestions(self, project_data: dict) -> list:
        suggestions = []

        if project_data.get("tower_count", 0) > 20:
            suggestions.append("Consider breaking the project into phases to manage costs better")

        if project_data.get("terrain") == "mountain":
            suggestions.append("Mountain terrain detected - budget extra time for installation. Consider hiring experienced teams.")

        if project_data.get("fiber_length_km", 0) > 100:
            suggestions.append("Long distance fiber - consider optimizing routing to reduce costs")

        if project_data.get("labor_type") == "unskilled":
            suggestions.append("Consider training workers on site to improve efficiency and reduce rework")

        avg_cost_per_tower = project_data.get("total_project_cost", 0) / max(project_data.get("tower_count", 1), 1)
        if avg_cost_per_tower > 500000:
            suggestions.append("Cost per tower is high - review material sourcing options")

        return suggestions

estimator = AICostEstimator()
