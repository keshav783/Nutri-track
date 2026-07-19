// ============================================================
// Nutrition math. All formulas are standard, widely-cited
// estimates — not medical advice. Kept as pure functions so
// the intake form can show its work.
// ============================================================

export const ACTIVITY_MULTIPLIERS = {
  sedentary: { value: 1.2, label: 'Sedentary (little or no exercise)' },
  light: { value: 1.375, label: 'Light (exercise 1-3 days/week)' },
  moderate: { value: 1.55, label: 'Moderate (exercise 3-5 days/week)' },
  active: { value: 1.725, label: 'Active (exercise 6-7 days/week)' },
  very_active: { value: 1.9, label: 'Very active (hard exercise + physical job)' },
};

// Mifflin-St Jeor Equation
export function calculateBMR({ gender, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return Math.round(base + 5);
  if (gender === 'female') return Math.round(base - 161);
  // 'other': average of the male/female offsets, a common approximation
  return Math.round(base - 78);
}

export function calculateTDEE(bmr, activityLevel) {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel]?.value ?? 1.2;
  return Math.round(bmr * multiplier);
}

// Goal adjusts calories by a standard ~20% deficit/surplus
export function calculateTargetCalories(tdee, goal) {
  if (goal === 'lose') return Math.round(tdee * 0.8);
  if (goal === 'gain') return Math.round(tdee * 1.15);
  return tdee; // maintain
}

// Macro split:
// - Protein: 1.8g/kg bodyweight (higher end to support muscle retention/growth)
// - Fat: 25% of total calories
// - Fiber: 14g per 1000 kcal (standard dietary guideline ratio)
// - Carbs: remaining calories
export function calculateMacroTargets({ targetCalories, weightKg, goal }) {
  const proteinPerKg = goal === 'gain' ? 2.0 : 1.8;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const proteinCals = proteinG * 4;

  const fatCals = Math.round(targetCalories * 0.25);
  const fatsG = Math.round(fatCals / 9);

  const fiberG = Math.round((targetCalories / 1000) * 14);

  const remainingCals = Math.max(targetCalories - proteinCals - fatCals, 0);
  const carbsG = Math.round(remainingCals / 4);

  return { proteinG, fiberG, carbsG, fatsG };
}

export function calculateWaterTargetMl(weightKg) {
  // ~35ml per kg bodyweight, a common general-purpose estimate
  return Math.round(weightKg * 35);
}

// Runs the full pipeline the intake form needs
export function computeAllTargets(profile) {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, profile.goal);
  const macros = calculateMacroTargets({
    targetCalories,
    weightKg: profile.weightKg,
    goal: profile.goal,
  });
  const waterMl = calculateWaterTargetMl(profile.weightKg);

  return { bmr, tdee, targetCalories, ...macros, waterMl };
}

// ---------- Workout calorie burn (MET-based) ----------
// calories = MET * weight(kg) * duration(hours)
export const MET_VALUES = {
  running: { light: 7.0, moderate: 9.8, vigorous: 12.8 },
  cycling: { light: 4.0, moderate: 8.0, vigorous: 10.0 },
  swimming: { light: 5.8, moderate: 8.3, vigorous: 10.0 },
  walking: { light: 2.8, moderate: 3.5, vigorous: 4.8 },
  rowing: { light: 3.5, moderate: 7.0, vigorous: 8.5 },
  elliptical: { light: 4.5, moderate: 5.5, vigorous: 7.0 },
  jump_rope: { light: 8.8, moderate: 11.0, vigorous: 12.3 },
  hiit: { light: 6.0, moderate: 8.0, vigorous: 10.0 },
  strength_training: { light: 3.0, moderate: 5.0, vigorous: 6.0 },
  yoga: { light: 2.5, moderate: 3.0, vigorous: 4.0 },
};

export function estimateCaloriesBurned({ activityType, intensity, durationMinutes, weightKg }) {
  const table = MET_VALUES[activityType] ?? MET_VALUES.strength_training;
  const met = table[intensity] ?? table.moderate;
  const hours = durationMinutes / 60;
  return Math.round(met * weightKg * hours);
}
