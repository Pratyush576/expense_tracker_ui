import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Alert, Button, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { formatCurrency } from './utils/currency';
import { RocketFill, PlusCircle } from 'react-bootstrap-icons'; // Import icons

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const HomePage = ({ onProfileSelect, setShowCreateProfileModalFromHome }) => {
    const [profilesSummary, setProfilesSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfiles = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/profiles`);
            const profiles = response.data;
            const summary = [];

            for (const profile of profiles) {
                if (profile.profile_type === 'EXPENSE_MANAGER') {
                    const transactionsResponse = await axios.get(`${API_BASE_URL}/api/expenses?profile_id=${profile.id}`);
                    const transactions = [...transactionsResponse.data.income, ...transactionsResponse.data.expenses];
                    const total_income = transactions.filter(t => t.amount >= 0).reduce((acc, t) => acc + t.amount, 0);
                    const total_expenses = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
                    const net_income = total_income + total_expenses;
                    summary.push({ ...profile, total_income, total_expenses, net_income });
                } else if (profile.profile_type === 'ASSET_MANAGER') {
                    const assetsSummaryResponse = await axios.get(`${API_BASE_URL}/api/profiles/${profile.id}/assets/total_latest_value`);
                    const { total_latest_asset_value, total_asset_value, total_debt_value } = assetsSummaryResponse.data;
                    summary.push({ ...profile, total_latest_asset_value, total_asset_value, total_debt_value });
                }
            }
            setProfilesSummary(summary);
        } catch (err) {
            setError("Failed to fetch profiles summary.");
            console.error("Error fetching profiles summary:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    if (loading) {
        return <Alert variant="info">Loading profiles summary...</Alert>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    if (profilesSummary.length === 0) {
        return (
            <Card className="shadow-lg p-4 text-center">
                <Card.Body>
                    <RocketFill size={96} className="text-primary mb-4" />
                    <h1 className="display-5 text-primary mb-3">Welcome to Your Financial Journey!</h1>
                    <p className="lead mb-4">
                        It looks like you haven't created any profiles yet. Let's get you started!
                        Create your first profile to begin tracking expenses, managing assets, and gaining valuable financial insights.
                    </p>
                    <Button variant="primary" size="lg" onClick={() => setShowCreateProfileModalFromHome(true)}>
                        <PlusCircle className="me-2" />Create Your First Profile
                    </Button>
                    <p className="mt-3 text-muted">
                        (You can also create a profile using the '+' button in the sidebar)
                    </p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg">
            <Card.Header as="h5">All Profiles Summary (Current Year)</Card.Header>
            <Card.Body>
                <Table striped bordered hover responsive className="expense-table">
                    <thead>
                        <tr>
                            <th>Profile Name</th>
                            <th>Profile Type</th>
                            <th>Net Income / Net Asset Value</th>
                            <th>Total Expenses / Total Assets</th>
                            <th>Net Income / Total Debt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profilesSummary.map(profile => (
                            <tr key={profile.id} onClick={() => onProfileSelect(profile.id)} style={{ cursor: 'pointer' }}>
                                <td>{profile.name}</td>
                                <td>{profile.profile_type}</td>
                                {profile.profile_type === 'EXPENSE_MANAGER' ? (
                                    <>
                                        <td>{formatCurrency(profile.total_income ?? 0, profile.currency)}</td>
                                        <td>{formatCurrency(profile.total_expenses ?? 0, profile.currency)}</td>
                                        <td>{formatCurrency(profile.net_income ?? 0, profile.currency)}</td>
                                    </>
                                ) : (
                                    <>
                                        <td>{formatCurrency(profile.total_latest_asset_value ?? 0, profile.currency)}</td>
                                        <td>{formatCurrency(profile.total_asset_value ?? 0, profile.currency)}</td>
                                        <td>{formatCurrency(profile.total_debt_value ?? 0, profile.currency)}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default HomePage;
