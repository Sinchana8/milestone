// index.js

const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const { expenses, categories } = require('./data');

// Initialize the app
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Add Expense (POST /expenses)
app.post('/expenses', (req, res) => {
  const { category, amount, date } = req.body;

  // Validate data
  if (!category || !categories.includes(category)) {
    return res.status(400).json({ status: "error", error: "Invalid or missing category" });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ status: "error", error: "Amount must be a positive number" });
  }

  const newExpense = { id: Date.now().toString(), category, amount, date: date || new Date().toISOString() };
  expenses.push(newExpense);

  res.json({ status: "success", data: newExpense });
});

// Get Expenses (GET /expenses)
app.get('/expenses', (req, res) => {
  const { category, startDate, endDate } = req.query;

  let filteredExpenses = expenses;

  if (category && categories.includes(category)) {
    filteredExpenses = filteredExpenses.filter(exp => exp.category === category);
  }

  if (startDate) {
    filteredExpenses = filteredExpenses.filter(exp => new Date(exp.date) >= new Date(startDate));
  }

  if (endDate) {
    filteredExpenses = filteredExpenses.filter(exp => new Date(exp.date) <= new Date(endDate));
  }

  res.json({ status: "success", data: filteredExpenses });
});

// Analyze Spending (GET /expenses/analysis)
app.get('/expenses/analysis', (req, res) => {
  const categoryTotals = categories.reduce((acc, category) => {
    acc[category] = expenses.filter(exp => exp.category === category)
                             .reduce((sum, exp) => sum + exp.amount, 0);
    return acc;
  }, {});

  const monthlyTotals = expenses.reduce((acc, exp) => {
    const month = new Date(exp.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = 0;
    acc[month] += exp.amount;
    return acc;
  }, {});

  res.json({ status: "success", data: { categoryTotals, monthlyTotals } });
});

// Cron job for generating weekly/monthly summary reports
cron.schedule('0 0 * * 7', () => {  // Every Sunday at midnight
  const weeklyTotal = expenses.filter(exp => {
    const today = new Date();
    const expenseDate = new Date(exp.date);
    return expenseDate >= new Date(today.setDate(today.getDate() - 7)); // Last 7 days
  }).reduce((sum, exp) => sum + exp.amount, 0);

  console.log(`Weekly Expense Summary: $${weeklyTotal}`);
});

cron.schedule('0 0 1 * *', () => {  // Every 1st day of the month at midnight
  const monthlyTotal = expenses.filter(exp => {
    const today = new Date();
    const expenseDate = new Date(exp.date);
    return expenseDate.getMonth() === today.getMonth() && expenseDate.getFullYear() === today.getFullYear();
  }).reduce((sum, exp) => sum + exp.amount, 0);

  console.log(`Monthly Expense Summary: $${monthlyTotal}`);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Personal Expense Tracker API running on port ${PORT}`);
});
