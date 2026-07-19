import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const manualEmpty = {
  food_name: '',
  meal_type: 'breakfast',
  quantity: 1,
  calories: '',
  protein_g: '',
  fiber_g: '',
  carbs_g: '',
  fats_g: '',
};

export default function FoodLog({ selectedDate, onLogged }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('search'); // 'search' | 'manual'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState(manualEmpty);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      // Open Food Facts — free, no API key required
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          query
        )}&search_simple=1&action=process&json=1&page_size=15`
      );
      const data = await res.json();
      setResults(data.products || []);
    } catch (err) {
      setError('Search failed. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }

  async function logFromSearchResult(product, mealType) {
    const n = product.nutriments || {};
    const entry = {
      user_id: user.id,
      logged_date: selectedDate,
      food_name: product.product_name || product.generic_name || 'Unknown food',
      source: 'off',
      quantity: 1,
      quantity_unit: 'serving (100g)',
      calories: n['energy-kcal_100g'] ?? 0,
      protein_g: n['proteins_100g'] ?? 0,
      fiber_g: n['fiber_100g'] ?? 0,
      carbs_g: n['carbohydrates_100g'] ?? 0,
      fats_g: n['fat_100g'] ?? 0,
      meal_type: mealType,
    };
    await saveEntry(entry);
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    const entry = {
      user_id: user.id,
      logged_date: selectedDate,
      food_name: manual.food_name,
      source: 'manual',
      quantity: Number(manual.quantity) || 1,
      quantity_unit: 'serving',
      calories: Number(manual.calories) || 0,
      protein_g: Number(manual.protein_g) || 0,
      fiber_g: Number(manual.fiber_g) || 0,
      carbs_g: Number(manual.carbs_g) || 0,
      fats_g: Number(manual.fats_g) || 0,
      meal_type: manual.meal_type,
    };
    const ok = await saveEntry(entry);
    if (ok) setManual(manualEmpty);
  }

  async function saveEntry(entry) {
    setError('');
    const { error: err } = await supabase.from('food_logs').insert(entry);
    if (err) {
      setError(err.message);
      return false;
    }
    onLogged?.();
    return true;
  }

  return (
    <div className="food-log-panel">
      <div className="tab-row">
        <button className={tab === 'search' ? 'tab active' : 'tab'} onClick={() => setTab('search')}>
          Search food
        </button>
        <button className={tab === 'manual' ? 'tab active' : 'tab'} onClick={() => setTab('manual')}>
          Manual entry
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {tab === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="search-row">
            <input
              type="text"
              placeholder="e.g. greek yogurt"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          <ul className="result-list">
            {results.map((p) => (
              <li key={p.code || p._id} className="result-item">
                <div>
                  <strong>{p.product_name || p.generic_name || 'Unnamed product'}</strong>
                  <div className="muted small">
                    {Math.round(p.nutriments?.['energy-kcal_100g'] ?? 0)} kcal / 100g ·{' '}
                    {Math.round(p.nutriments?.proteins_100g ?? 0)}g protein
                  </div>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      logFromSearchResult(p, e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>Add to…</option>
                  {MEAL_TYPES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="form-grid">
          <label className="span-2">
            Food name
            <input required value={manual.food_name}
              onChange={(e) => setManual((m) => ({ ...m, food_name: e.target.value }))} />
          </label>
          <label>
            Meal
            <select value={manual.meal_type}
              onChange={(e) => setManual((m) => ({ ...m, meal_type: e.target.value }))}>
              {MEAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>
            Servings
            <input type="number" min="0.25" step="0.25" value={manual.quantity}
              onChange={(e) => setManual((m) => ({ ...m, quantity: e.target.value }))} />
          </label>
          <label>
            Calories
            <input type="number" min="0" value={manual.calories}
              onChange={(e) => setManual((m) => ({ ...m, calories: e.target.value }))} />
          </label>
          <label>
            Protein (g)
            <input type="number" min="0" value={manual.protein_g}
              onChange={(e) => setManual((m) => ({ ...m, protein_g: e.target.value }))} />
          </label>
          <label>
            Fiber (g)
            <input type="number" min="0" value={manual.fiber_g}
              onChange={(e) => setManual((m) => ({ ...m, fiber_g: e.target.value }))} />
          </label>
          <label>
            Carbs (g)
            <input type="number" min="0" value={manual.carbs_g}
              onChange={(e) => setManual((m) => ({ ...m, carbs_g: e.target.value }))} />
          </label>
          <label>
            Fats (g)
            <input type="number" min="0" value={manual.fats_g}
              onChange={(e) => setManual((m) => ({ ...m, fats_g: e.target.value }))} />
          </label>
          <button type="submit" className="btn-primary span-2">Add entry</button>
        </form>
      )}
    </div>
  );
}
