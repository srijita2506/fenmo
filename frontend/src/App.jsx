import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/expenses';

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('date_desc');

  // Form State
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Fetch expenses with optional filters and sorting
  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ sort: sortOrder });
      if (filterCategory) query.append('category', filterCategory);
      
      const response = await fetch(`${API_URL}?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      
      const data = await response.json();
      setExpenses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, sortOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Generate idempotency key for this exact submission attempt
    const idempotencyKey = uuidv4();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: formData.date
        })
      });

      if (!response.ok) throw new Error('Submission failed');
      
      // Reset form and refresh list
      setFormData({ ...formData, amount: '', description: '' });
      fetchExpenses();
    } catch (err) {
      setError('Network error: Your submission might have failed. Please check before retrying.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total: API returns smallest unit, so we divide by 100
  const total = expenses.reduce((sum, exp) => sum + (exp.amount / 100), 0);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Expense Tracker</h1>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="number" 
          step="0.01" 
          min="0.01"
          placeholder="Amount (₹)" 
          value={formData.amount} 
          onChange={(e) => setFormData({...formData, amount: e.target.value})} 
          required 
        />
        <select 
          value={formData.category} 
          onChange={(e) => setFormData({...formData, category: e.target.value})}
        >
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Utilities">Utilities</option>
          <option value="Entertainment">Entertainment</option>
        </select>
        <input 
          type="text" 
          placeholder="Description" 
          value={formData.description} 
          onChange={(e) => setFormData({...formData, description: e.target.value})} 
        />
        <input 
          type="date" 
          value={formData.date} 
          onChange={(e) => setFormData({...formData, date: e.target.value})} 
          required 
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>
      </form>

      <hr />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Expenses (Total: ₹{total.toFixed(2)})</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="date_desc">Sort: Date (Newest First)</option>
            <option value="created_desc">Sort: Date Added</option>
          </select>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Utilities">Utilities</option>
            <option value="Entertainment">Entertainment</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p>Loading expenses...</p>
      ) : (
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id}>
                <td>{exp.date}</td>
                <td>{exp.description}</td>
                <td>{exp.category}</td>
                <td>₹{(exp.amount / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
