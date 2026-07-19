import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { useProfile } from '../lib/ProfileContext';
import { ACTIVITY_MULTIPLIERS, computeAllTargets } from '../lib/calculations';

const emptyForm = {
  age: '',
  gender: 'female',
  heightCm: '',
  weightKg: '',
  activityLevel: 'moderate',
  goal: 'maintain',
  targetWeightKg: '',
};

export default function IntakeForm() {
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();

  const [form, setForm] = useState(() =>
    profile
      ? {
          age: profile.age,
          gender: profile.gender,
          heightCm: profile.height_cm,
          weightKg: profile.weight_kg,
          activityLevel: profile.activity_level,
          goal: profile.goal,
          targetWeightKg: profile.target_weight_kg ?? '',
        }
      : emptyForm
  );
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setPreview(null);
  }

  function handleCalculate(e) {
    e.preventDefault();
    const parsed = {
      age: Number(form.age),
      gender: form.gender,
      heightCm: Number(form.heightCm),
      weightKg: Number(form.weightKg),
      activityLevel: form.activityLevel,
      goal: form.goal,
    };
    setPreview(computeAllTargets(parsed));
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setError('');

    const row = {
      user_id: user.id,
      age: Number(form.age),
      gender: form.gender,
      height_cm: Number(form.heightCm),
      weight_kg: Number(form.weightKg),
      activity_level: form.activityLevel,
      goal: form.goal,
      target_weight_kg: form.targetWeightKg ? Number(form.targetWeightKg) : null,
      bmr: preview.bmr,
      tdee: preview.tdee,
      target_calories: preview.targetCalories,
      target_protein_g: preview.proteinG,
      target_fiber_g: preview.fiberG,
      target_carbs_g: preview.carbsG,
      target_fats_g: preview.fatsG,
      target_water_ml: preview.waterMl,
    };

    const { error: err } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshProfile();
    navigate('/dashboard');
  }

  return (
    <div className="page">
      <h1>{profile ? 'Edit your profile' : "Let's set up your profile"}</h1>
      <p className="muted">
        This calculates your daily targets using the Mifflin-St Jeor equation. You can edit
        this anytime.
      </p>

      <form onSubmit={handleCalculate} className="intake-form">
        <div className="form-grid">
          <label>
            Age
            <input type="number" min="10" max="119" required value={form.age}
              onChange={(e) => update('age', e.target.value)} />
          </label>
          <label>
            Gender
            <select value={form.gender} onChange={(e) => update('gender', e.target.value)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Height (cm)
            <input type="number" min="1" required value={form.heightCm}
              onChange={(e) => update('heightCm', e.target.value)} />
          </label>
          <label>
            Weight (kg)
            <input type="number" min="1" step="0.1" required value={form.weightKg}
              onChange={(e) => update('weightKg', e.target.value)} />
          </label>
          <label>
            Activity level
            <select value={form.activityLevel} onChange={(e) => update('activityLevel', e.target.value)}>
              {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Goal
            <select value={form.goal} onChange={(e) => update('goal', e.target.value)}>
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain muscle</option>
            </select>
          </label>
          <label>
            Target weight (kg, optional)
            <input type="number" min="1" step="0.1" value={form.targetWeightKg}
              onChange={(e) => update('targetWeightKg', e.target.value)} />
          </label>
        </div>

        <button type="submit" className="btn-primary">Calculate my targets</button>
      </form>

      {preview && (
        <div className="calc-preview">
          <h2>Your numbers</h2>
          <ol className="calc-steps">
            <li>
              <strong>BMR</strong> (Mifflin-St Jeor): {preview.bmr} kcal/day —
              calories your body burns at complete rest.
            </li>
            <li>
              <strong>TDEE</strong>: {preview.bmr} × activity multiplier = {preview.tdee} kcal/day —
              your maintenance calories.
            </li>
            <li>
              <strong>Daily calorie target</strong>: {preview.targetCalories} kcal
              ({form.goal === 'lose' ? '20% deficit' : form.goal === 'gain' ? '15% surplus' : 'at maintenance'})
            </li>
          </ol>
          <div className="target-grid">
            <div><span>Calories</span><strong>{preview.targetCalories}</strong></div>
            <div><span>Protein</span><strong>{preview.proteinG} g</strong></div>
            <div><span>Fiber</span><strong>{preview.fiberG} g</strong></div>
            <div><span>Carbs</span><strong>{preview.carbsG} g</strong></div>
            <div><span>Fats</span><strong>{preview.fatsG} g</strong></div>
            <div><span>Water</span><strong>{preview.waterMl} ml</strong></div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </div>
      )}
    </div>
  );
}
