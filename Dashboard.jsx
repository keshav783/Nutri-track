import { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import ProgressBar from './ProgressBar';
import FoodLog from './FoodLog';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [entries, setEntries] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);
  const [calorieHistory, setCalorieHistory] = useState([]);
  const [newWeight, setNewWeight] = useState('');

  const loadDayEntries = useCallback(async () => {
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_date', selectedDate)
      .order('created_at', { ascending: true });
    setEntries(data ?? []);
  }, [user, selectedDate]);

  const loadHistory = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data: weights } = await supabase
      .from('weight_logs')
      .select('logged_date, weight_kg')
      .eq('user_id', user.id)
      .gte('logged_date', sinceStr)
      .order('logged_date', { ascending: true });
    setWeightHistory((weights ?? []).map((w) => ({ date: w.logged_date.slice(5), weight: w.weight_kg })));

    const { data: foods } = await supabase
      .from('food_logs')
      .select('logged_date, calories')
      .eq('user_id', user.id)
      .gte('logged_date', sinceStr);
    const byDate = {};
    (foods ?? []).forEach((f) => {
      byDate[f.logged_date] = (byDate[f.logged_date] || 0) + Number(f.calories);
    });
    const series = Object.entries(byDate)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, calories]) => ({ date: date.slice(5), calories: Math.round(calories) }));
    setCalorieHistory(series);
  }, [user]);

  useEffect(() => { loadDayEntries(); }, [loadDayEntries]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleDeleteEntry(id) {
    await supabase.from('food_logs').delete().eq('id', id);
    loadDayEntries();
  }

  async function handleLogWeight(e) {
    e.preventDefault();
    if (!newWeight) return;
    await supabase.from('weight_logs').upsert(
      { user_id: user.id, logged_date: selectedDate, weight_kg: Number(newWeight) },
      { onConflict: 'user_id,logged_date' }
    );
    setNewWeight('');
    loadHistory();
  }

  if (!profile) return null;

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + Number(e.calories) * Number(e.quantity || 1),
      protein_g: acc.protein_g + Number(e.protein_g) * Number(e.quantity || 1),
      fiber_g: acc.fiber_g + Number(e.fiber_g) * Number(e.quantity || 1),
      carbs_g: acc.carbs_g + Number(e.carbs_g) * Number(e.quantity || 1),
      fats_g: acc.fats_g + Number(e.fats_g) * Number(e.quantity || 1),
    }),
    { calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, fats_g: 0 }
  );

  const remaining = Math.round(profile.target_calories - totals.calories);

  return (
    <div className="page">
      <div className="dash-header">
        <h1>Dashboard</h1>
        <input
          type="date"
          value={selectedDate}
          max={todayStr()}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="card">
        <h2>Today vs. target</h2>
        <p className="muted">
          {remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over target`}
        </p>
        <ProgressBar label="Calories" value={totals.calories} target={profile.target_calories} unit="kcal" />
        <ProgressBar label="Protein" value={totals.protein_g} target={profile.target_protein_g} unit="g" />
        <ProgressBar label="Fiber" value={totals.fiber_g} target={profile.target_fiber_g} unit="g" />
        <ProgressBar label="Carbs" value={totals.carbs_g} target={profile.target_carbs_g} unit="g" />
        <ProgressBar label="Fats" value={totals.fats_g} target={profile.target_fats_g} unit="g" />
      </div>

      <div className="card">
        <h2>Log food</h2>
        <FoodLog selectedDate={selectedDate} onLogged={loadDayEntries} />
      </div>

      <div className="card">
        <h2>Entries for {selectedDate}</h2>
        {entries.length === 0 && <p className="muted">Nothing logged yet.</p>}
        <ul className="entry-list">
          {entries.map((e) => (
            <li key={e.id} className="entry-item">
              <div>
                <strong>{e.food_name}</strong>
                <div className="muted small">
                  {e.meal_type} · {Math.round(e.calories * e.quantity)} kcal ·{' '}
                  {Math.round(e.protein_g * e.quantity)}g protein
                </div>
              </div>
              <button className="btn-link" onClick={() => handleDeleteEntry(e.id)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Weight</h2>
        <form onSubmit={handleLogWeight} className="search-row">
          <input
            type="number"
            step="0.1"
            placeholder={`Weight on ${selectedDate} (kg)`}
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
          />
          <button type="submit" className="btn-primary">Log weight</button>
        </form>
        {weightHistory.length > 1 && (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={['auto', 'auto']} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#2f5d50" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Calorie intake (last 30 days)</h2>
        {calorieHistory.length > 1 ? (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={calorieHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="calories" stroke="#c8763a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted">Log a few more days to see a trend.</p>
        )}
      </div>
    </div>
  );
}
