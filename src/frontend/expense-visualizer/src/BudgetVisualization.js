import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Import Filler plugin
} from 'chart.js';
import { formatCurrency } from './utils/currency'; // Import the utility

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Register Filler plugin
);

const BudgetVisualization = ({ settings, categories, selectedYear, currency, activeProfileId }) => {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [timeGranularity, setTimeGranularity] = useState('Monthly');
  const [numPeriods, setNumPeriods] = useState(12);
  const [budgetData, setBudgetData] = useState([]);
  const [annualBudgetData, setAnnualBudgetData] = useState(null); // New state for annual data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const availableCategories = [{ name: "ALL_CATEGORIES" }, ...categories];

  useEffect(() => {
    const fetchBudgetData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch data for the selected granularity
        const params = {
          profile_id: activeProfileId,
          time_granularity: timeGranularity,
          num_periods: numPeriods,
          year: selectedYear, // Add selectedYear to params
          ...(selectedCategories.length > 0 && { categories: selectedCategories })
        };
        const response = await axios.get('http://localhost:8000/api/budget_vs_expenses', { params });
        setBudgetData(response.data);

        // Fetch annual data for the current year
        const annualParams = {
          profile_id: activeProfileId,
          time_granularity: 'Yearly',
          num_periods: 1, // Only fetch for the current year
          year: selectedYear, // Add selectedYear to annualParams
          ...(selectedCategories.length > 0 && { categories: selectedCategories })
        };
        const annualResponse = await axios.get('http://localhost:8000/api/budget_vs_expenses', { params: annualParams });
        setAnnualBudgetData(annualResponse.data[0] || null);
        console.log("BudgetVisualization - annualBudgetData:", annualResponse.data[0]);
      } catch (err) {
        console.error("Error fetching budget data:", err);
        setError("Failed to fetch budget data. Please ensure the backend is running and data is available.");
        setBudgetData([]);
        setAnnualBudgetData(null);
      } finally {
        setLoading(false);
      }
    };

    if (activeProfileId) {
      fetchBudgetData();
    }
  }, [selectedCategories, timeGranularity, numPeriods, settings.budgets, selectedYear, activeProfileId]);

  // Prepare data for Chart.js
  const chartLabels = budgetData.map(data => data.period);
  const budgetedAmounts = budgetData.map(data => data.budgeted_amount);
  const actualExpenses = budgetData.map(data => data.actual_expenses);

  // Data for conditional fills
  const fillUnderBudget = budgetData.map(data => Math.min(data.actual_expenses, data.budgeted_amount));
  const fillOverBudget = budgetData.map(data => Math.max(0, data.actual_expenses - data.budgeted_amount));

  console.log("BudgetVisualization - Values for labels:");
  console.log("  Budgeted:", annualBudgetData?.budgeted_amount);
  console.log("  Actual:", annualBudgetData?.actual_expenses);
  console.log("  Difference:", annualBudgetData?.difference);

  const data = {
    labels: chartLabels,
    datasets: [
      {
        // Dataset 0: Budgeted Amount Line (drawn first)
        type: 'line',
        label: 'Budgeted Amount',
        data: budgetedAmounts,
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        order: 1, // Draw budget line on top
      },
      {
        // Dataset 1: Actual Expenses Line with conditional fill
        type: 'line',
        label: 'Actual Expenses',
        data: actualExpenses,
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 5,
        order: 0, // Draw expenses line below budget line
        fill: {
          target: 0, // Fill to the 'Budgeted Amount' line (Dataset 0)
          above: 'rgba(255, 0, 0, 0.3)', // Red when Actual Expenses is above Budgeted Amount
          below: 'rgba(0, 128, 0, 0.3)', // Green when Actual Expenses is below Budgeted Amount
        },
      },
    ],
  };

  const chartTitle = `Budget vs. Actual Expenses for ${
    selectedCategories.length === 0 || selectedCategories.includes("ALL_CATEGORIES")
      ? "All Categories"
      : selectedCategories.join(', ')
  }`;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: chartTitle,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y, currency);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Period',
        },
      },
      y: {
        title: {
          display: true,
          text: `Amount (${currency})`, // Use currency here
        },
        beginAtZero: true,
        ticks: {
          callback: function(value, index, values) {
            return formatCurrency(value, currency);
          }
        }
      },
    },
  };

  return (
    <Card className="mb-4 shadow-lg">
      <Card.Header className="bg-primary text-white">Budget vs. Expense</Card.Header>
      <Card.Body>
        <Form>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group controlId="categorySelect">
                <Form.Label>Select Categories</Form.Label>
                <Form.Control
                  as="select"
                  multiple
                  value={selectedCategories}
                  onChange={(e) =>
                    setSelectedCategories(
                      Array.from(e.target.selectedOptions, (option) => option.value)
                    )
                  }
                >
                  {availableCategories.map((cat, index) => (
                    <option key={index} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="timeGranularitySelect">
                <Form.Label>Time Granularity</Form.Label>
                <Form.Control
                  as="select"
                  value={timeGranularity}
                  onChange={(e) => setTimeGranularity(e.target.value)}
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Yearly</option>
                </Form.Control>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="numPeriodsInput">
                <Form.Label>Number of Periods</Form.Label>
                <Form.Control
                  type="number"
                  value={numPeriods}
                  onChange={(e) => setNumPeriods(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>

        <div className="mt-4">
          {loading ? (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p>Loading budget data...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : budgetData.length === 0 ? (
            <Alert variant="info">No budget data available for the selected criteria. Please configure budgets in settings and ensure transactions exist.</Alert>
          ) : (
            <div style={{ height: '400px' }}>
              <Line data={data} options={options} />
            </div>
          )}
        </div>

        {annualBudgetData && (
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
      </Card.Body>
    </Card>
  );
};

export default BudgetVisualization;