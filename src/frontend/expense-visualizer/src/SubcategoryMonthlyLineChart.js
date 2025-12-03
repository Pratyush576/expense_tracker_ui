import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, Line } from 'recharts';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { formatCurrency } from './utils/currency'; // Import the utility

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', '#f45b5b', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'];

// Helper function to find the applicable budget for a given category, year, and month
const findApplicableBudget = (category, year, month, budgets) => {
  const safeBudgets = budgets || [];

  // If annual budget is requested, sum up all monthly budgets for that year
  if (month === null) {
    let totalAnnualBudget = 0;
    for (let m = 1; m <= 12; m++) {
      totalAnnualBudget += findApplicableBudget(category, year, m, budgets); // Recursive call for each month
    }
    return totalAnnualBudget;
  }

  // Monthly budget calculation (month is not null)

  // 1. Try to find an exact match for a specific month
  const exactBudget = safeBudgets.find(
    (b) =>
      b.category === category &&
      b.year === year &&
      b.months &&
      b.months.includes(month)
  );
  if (exactBudget) {
    return exactBudget.amount;
  }

  // 2. Try to find a budget for the whole year (treated as an annual total)
  const yearBudget = safeBudgets.find(
    (b) =>
      b.category === category &&
      b.year === year &&
      (!b.months || !b.months.length) // Check for empty array as well
  );
  if (yearBudget) {
    return yearBudget.amount / 12; // Treat as annual total, divide by 12 for monthly
  }

  // 3. Try to find a default budget for the category (treated as a recurring monthly amount)
  const defaultBudget = safeBudgets.find(
    (b) =>
      b.category === category &&
      b.year === null &&
      (!b.months || !b.months.length) // Check for empty array as well
  );
  if (defaultBudget) {
    return defaultBudget.amount; // Treat as monthly amount
  }

  return 0; // No budget found for the month
};

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    const total = payload
      .filter(p => p.name !== 'Budget')
      .reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        <p className="label">{`${label}`}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value, currency)}`}
          </p>
        ))}
        <p className="total" style={{ fontWeight: 'bold' }}>
          {`Total: ${formatCurrency(total, currency)}`}
        </p>
      </div>
    );
  }

  return null;
};

const SubcategoryMonthlyLineChart = ({ data, mainCategoryName, budgets, selectedYear, currency, activeProfileId }) => {
  const [annualBudgetData, setAnnualBudgetData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnnualBudgetData = async () => {
      setLoading(true);
      setError(null);
      try {
        const annualParams = {
          profile_id: activeProfileId,
          time_granularity: 'Yearly',
          num_periods: 1,
          year: selectedYear,
          categories: [mainCategoryName],
        };
        const annualResponse = await axios.get('http://localhost:8000/api/budget_vs_expenses', { params: annualParams });
        setAnnualBudgetData(annualResponse.data[0] || null);
      } catch (err) {
        console.error("Error fetching annual budget data:", err);
        setError("Failed to fetch annual budget data.");
        setAnnualBudgetData(null);
      } finally {
        setLoading(false);
      }
    };

    if (selectedYear && activeProfileId) {
      fetchAnnualBudgetData();
    }
  }, [mainCategoryName, budgets, selectedYear, activeProfileId]);

  if (!data || data.length === 0) {
    return (
      <Card className="mb-4 shadow-lg">
        <Card.Header>{mainCategoryName} - Monthly Subcategory Trends</Card.Header>
        <Card.Body>
          <p>No data available for this category.</p>
        </Card.Body>
      </Card>
    );
  }

  const processedData = data.map(item => {
    return {
      YearMonth: item.YearMonth,
      mainCategory: item.Category,
      subCategory: item.Subcategory || 'Uncategorized',
      total_cost: item.total_cost,
    };
  }).filter(item => item.mainCategory === mainCategoryName);

  if (processedData.length === 0) {
    return (
      <Card className="mb-4 shadow-lg">
        <Card.Header>{mainCategoryName} - Monthly Subcategory Trends</Card.Header>
        <Card.Body>
          <p>No data available for this category.</p>
        </Card.Body>
      </Card>
    );
  }

  // Generate all 12 months of the selected year
  const allMonths = [];
  if (selectedYear) {
    for (let i = 0; i < 12; i++) {
      const monthStr = (i + 1).toString().padStart(2, '0');
      allMonths.push(`${selectedYear}-${monthStr}`);
    }
  }

  const aggregatedBySubcategory = processedData.reduce((acc, item) => {
    const key = `${item.YearMonth}-${item.subCategory}`;
    if (!acc[key]) {
      acc[key] = { ...item, total_cost: 0 };
    }
    acc[key].total_cost += item.total_cost;
    return acc;
  }, {});

  const finalAggregatedData = Object.values(aggregatedBySubcategory);

  const allSubcategories = [...new Set(finalAggregatedData.map(item => item.subCategory))];

  const chartData = allMonths.map(month => {
    const monthData = { YearMonth: month };
    const [yearStr, monthStr] = month.split('-');
    const currentYear = parseInt(yearStr);
    const currentMonth = parseInt(monthStr);

    allSubcategories.forEach(subCat => {
      const entry = finalAggregatedData.find(item => item.YearMonth === month && item.subCategory === subCat);
      const cost = entry ? entry.total_cost : 0;
      monthData[subCat] = cost;
    });

    monthData['Budget'] = findApplicableBudget(mainCategoryName, currentYear, currentMonth, budgets);
    return monthData;
  });

  const allDataKeys = allSubcategories;

  return (
    <Card className="mb-4 shadow-lg">
      <Card.Header>{mainCategoryName} - Monthly Subcategory Trends</Card.Header>
      <Card.Body style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5, right: 30, left: 20, bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="YearMonth">
              <Label value="Month" offset={-3} position="insideBottom" />
            </XAxis>
            <YAxis formatter={(value) => formatCurrency(value, currency)}>
              <Label value="Amount" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
            </YAxis>
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend />
            {allDataKeys.map((dataKey, index) => (
                <Bar
                  key={dataKey}
                  dataKey={dataKey}
                  stackId="a"
                  fill={COLORS[index % COLORS.length]}
                />
            ))}
            <Line type="monotone" dataKey="Budget" stroke="#ff0000" strokeWidth={2} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card.Body>
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : annualBudgetData && (
        <Card className="mt-4">
          <Card.Header className="bg-info text-white">Annual Summary ({annualBudgetData.period})</Card.Header>
          <Card.Body>
            <Row>
              <Col>
                <strong>Budgeted:</strong> {formatCurrency(annualBudgetData.budgeted_amount, currency)}
              </Col>
              <Col>
                <strong>Actual:</strong> {formatCurrency(annualBudgetData.actual_expenses, currency)}
              </Col>
              <Col>
                <strong>Remaining fund:</strong> {formatCurrency(annualBudgetData.difference, currency)}
              </Col>
              <Col>
                <strong>Status:</strong> {annualBudgetData.over_budget ? <span className="text-danger">Over Budget</span> : <span className="text-success">Under Budget</span>}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </Card>
  );
};

export default SubcategoryMonthlyLineChart;

