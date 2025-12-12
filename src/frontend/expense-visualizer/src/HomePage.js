import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Alert, Button, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { formatCurrency } from './utils/currency';
import { RocketFill, PlusCircle, ArrowUpCircleFill, ArrowDownCircleFill, InfoCircleFill } from 'react-bootstrap-icons'; // Import icons
import './HomePage.css'; // Import the new CSS file

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const HomePage = ({ onProfileSelect, setShowCreateProfileModalFromHome, currentUser }) => {
    const [profilesSummary, setProfilesSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        let greeting;
        if (hour < 12) {
            greeting = "Good morning";
        } else if (hour < 18) {
            greeting = "Good afternoon";
        } else {
            greeting = "Good evening";
        }
        const userName = currentUser?.user_first_name || "there";
        return `${greeting}, ${userName}!`;
    };

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

    const expenseManagerProfiles = profilesSummary.filter(p => p.profile_type === 'EXPENSE_MANAGER');
    const assetManagerProfiles = profilesSummary.filter(p => p.profile_type === 'ASSET_MANAGER');

    const generateSummaryParagraph = () => {
        const summaries = [];

        if (profilesSummary.length === 0) {
            return [{ message: "It looks like you haven't created any profiles yet. Start your financial journey by creating your first profile!", icon: <InfoCircleFill className="me-2 text-info" />, sentiment: "neutral" }];
        }

        expenseManagerProfiles.forEach(profile => {
            const netIncome = profile.net_income ?? 0;
            const formattedNetIncome = formatCurrency(Math.abs(netIncome), profile.currency);
            const formattedTotalIncome = formatCurrency(profile.total_income ?? 0, profile.currency);
            const formattedTotalExpenses = formatCurrency(Math.abs(profile.total_expenses ?? 0), profile.currency);

            let message = `Your **${profile.name}** expense management profile`;
            let icon = <InfoCircleFill className="me-2 text-info" />;
            let sentiment = "neutral";

            if (netIncome > 0) {
                message += ` is performing exceptionally well with a **net income of ${formattedNetIncome}** for the current year! You've earned ${formattedTotalIncome} and spent ${formattedTotalExpenses}. Keep up the fantastic work!`;
                icon = <ArrowUpCircleFill className="me-2 text-success" />;
                sentiment = "positive";
            } else if (netIncome < 0) {
                message += ` shows a **net loss of ${formattedNetIncome}** for the current year. You've earned ${formattedTotalIncome} but spent ${formattedTotalExpenses}. It might be a good time to review your spending habits and look for areas to optimize.`;
                icon = <ArrowDownCircleFill className="me-2 text-danger" />;
                sentiment = "negative";
            } else {
                message += ` has a **net income of zero** for the current year, with ${formattedTotalIncome} in income and ${formattedTotalExpenses} in expenses. A balanced approach!`;
            }
            summaries.push({ message: message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'), icon, sentiment });
        });

        assetManagerProfiles.forEach(profile => {
            const totalLatestAssetValue = profile.total_latest_asset_value ?? 0;
            const totalAssetValue = profile.total_asset_value ?? 0;
            const totalDebtValue = profile.total_debt_value ?? 0;

            const formattedTotalLatestAssetValue = formatCurrency(totalLatestAssetValue, profile.currency);
            const formattedTotalAssetValue = formatCurrency(totalAssetValue, profile.currency);
            const formattedTotalDebtValue = formatCurrency(Math.abs(totalDebtValue), profile.currency);

            let message = `Your **${profile.name}** asset management profile`;
            let icon = <InfoCircleFill className="me-2 text-info" />;
            let sentiment = "neutral";

            if (totalLatestAssetValue > 0 && totalDebtValue <= 0) { // Assuming positive net asset value is good
                message += ` is flourishing with a **total net asset value of ${formattedTotalLatestAssetValue}**! You have ${formattedTotalAssetValue} in assets and ${formattedTotalDebtValue} in liabilities. Excellent wealth management!`;
                icon = <ArrowUpCircleFill className="me-2 text-success" />;
                sentiment = "positive";
            } else if (totalLatestAssetValue < 0) { // Negative net asset value
                message += ` currently has a **negative net asset value of ${formattedTotalLatestAssetValue}**. With ${formattedTotalAssetValue} in assets and ${formattedTotalDebtValue} in liabilities, it's crucial to focus on reducing debt and growing your positive assets.`;
                icon = <ArrowDownCircleFill className="me-2 text-danger" />;
                sentiment = "negative";
            } else {
                message += ` holds assets worth **${formattedTotalLatestAssetValue}**, with ${formattedTotalAssetValue} in assets and ${formattedTotalDebtValue} in liabilities. A solid foundation!`;
            }
            summaries.push({ message: message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'), icon, sentiment });
        });

        return summaries;
    };

    const summaryMessages = generateSummaryParagraph();

    return (
        <div className="homepage-container">
            <Card className="shadow-lg mb-4 homepage-summary-card">
                <Card.Body>
                    <h2 className="mb-3">{getGreeting()}</h2>
                    <p className="lead mb-4">
                        Welcome to your personalized financial dashboard! Here's a quick overview of your financial health.
                        Let's make informed decisions together to achieve your financial goals.
                    </p>
                    {profilesSummary.length > 0 && (
                        <>
                            {summaryMessages.map((summary, index) => (
                                <p key={index} className={`lead mb-2 ${summary.sentiment === "positive" ? "text-success" : summary.sentiment === "negative" ? "text-danger" : ""}`}>
                                    {summary.icon} <span dangerouslySetInnerHTML={{ __html: summary.message }} />
                                </p>
                            ))}
                        </>
                    )}
                </Card.Body>
            </Card>

            {profilesSummary.length === 0 ? (
                <Card className="shadow-lg p-4 text-center mb-4">
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
            ) : (
                <>
                    {expenseManagerProfiles.length > 0 && (
                        <Card className="shadow-lg mb-4">
                            <Card.Header as="h5">Expense Manager Profiles (Current Year)</Card.Header>
                            <Card.Body>
                                <Table striped bordered hover responsive className="expense-table">
                                    <thead>
                                        <tr>
                                            <th>Profile Name</th>
                                            <th>Profile Type</th>
                                            <th>Total Income</th>
                                            <th>Total Expenses</th>
                                            <th>Net Income</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenseManagerProfiles.map(profile => (
                                            <tr key={profile.id} onClick={() => onProfileSelect(profile.id)} style={{ cursor: 'pointer' }}>
                                                <td>{profile.name}</td>
                                                <td>{profile.profile_type}</td>
                                                <td>{formatCurrency(profile.total_income ?? 0, profile.currency)}</td>
                                                <td>{formatCurrency(profile.total_expenses ?? 0, profile.currency)}</td>
                                                <td>{formatCurrency(profile.net_income ?? 0, profile.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}

                    {assetManagerProfiles.length > 0 && (
                        <Card className="shadow-lg mb-4">
                            <Card.Header as="h5">Asset Manager Profiles (Current Year)</Card.Header>
                            <Card.Body>
                                <Table striped bordered hover responsive className="expense-table">
                                    <thead>
                                        <tr>
                                            <th>Profile Name</th>
                                            <th>Profile Type</th>
                                            <th>Total Latest Value</th>
                                            <th>Total Assets</th>
                                            <th>Total Debt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assetManagerProfiles.map(profile => (
                                            <tr key={profile.id} onClick={() => onProfileSelect(profile.id)} style={{ cursor: 'pointer' }}>
                                                <td>{profile.name}</td>
                                                <td>{profile.profile_type}</td>
                                                <td>{formatCurrency(profile.total_latest_asset_value ?? 0, profile.currency)}</td>
                                                <td>{formatCurrency(profile.total_asset_value ?? 0, profile.currency)}</td>
                                                <td>{formatCurrency(profile.total_debt_value ?? 0, profile.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default HomePage;
