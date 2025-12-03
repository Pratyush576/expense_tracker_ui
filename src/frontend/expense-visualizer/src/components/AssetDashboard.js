import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, Row, Col } from 'react-bootstrap';
import { formatCurrency } from '../utils/currency'; // Adjust path as needed
import MonthlyAssetComparisonChart from './MonthlyAssetComparisonChart'; // Import the new chart component

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const AssetDashboard = ({ activeProfileId, currency, selectedYear }) => {
  const [totalLatestAssetValue, setTotalLatestAssetValue] = useState(0);
  const [totalAssetValue, setTotalAssetValue] = useState(0);
  const [totalDebtValue, setTotalDebtValue] = useState(0);
  const [monthlyAssetSummary, setMonthlyAssetSummary] = useState([]); // New state for monthly asset summary
  const [error, setError] = useState('');

  const fetchTotalAssetValue = useCallback(async () => {
    if (!activeProfileId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/assets/total_latest_value`);
      setTotalLatestAssetValue(response.data.total_latest_asset_value || 0);
      setTotalAssetValue(response.data.total_asset_value || 0);
      setTotalDebtValue(response.data.total_debt_value || 0);
      setError('');
    } catch (err) {
      console.error('Error fetching total latest asset value:', err);
      setError('Failed to fetch total asset value.');
      setTotalLatestAssetValue(0);
      setTotalAssetValue(0);
      setTotalDebtValue(0);
    }
  }, [activeProfileId]);

  const fetchMonthlyAssetSummary = useCallback(async () => {
    if (!activeProfileId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/assets/monthly_summary`);
      setMonthlyAssetSummary(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching monthly asset summary:', err);
      setError('Failed to fetch monthly asset summary.');
      setMonthlyAssetSummary([]);
    }
  }, [activeProfileId]);

  useEffect(() => {
    fetchTotalAssetValue();
    fetchMonthlyAssetSummary();
  }, [fetchTotalAssetValue, fetchMonthlyAssetSummary]);

  return (
    <div>
      <h2>Asset Manager Dashboard</h2>
      {error && <p className="text-danger">{error}</p>}
      <Row className="mb-4">
        <Col>
          <Card className="summary-card net-income-card">
            <Card.Header>Net Asset Value (Latest Records)</Card.Header>
            <Card.Body>
              <h5 className="card-title">{formatCurrency(totalLatestAssetValue, currency)}</h5>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="summary-card income-card">
            <Card.Header>Total Assets (Latest Records)</Card.Header>
            <Card.Body>
              <h5 className="card-title">{formatCurrency(totalAssetValue, currency)}</h5>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="summary-card expenses-card">
            <Card.Header>Total Debt (Latest Records)</Card.Header>
            <Card.Body>
              <h5 className="card-title">{formatCurrency(totalDebtValue, currency)}</h5>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>Monthly Asset Comparison</Card.Header>
            <Card.Body>
              <MonthlyAssetComparisonChart data={monthlyAssetSummary} currency={currency} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AssetDashboard;
