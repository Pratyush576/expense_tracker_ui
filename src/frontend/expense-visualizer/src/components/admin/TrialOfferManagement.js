import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const TrialOfferManagement = () => {
    const [trialDays, setTrialDays] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null); // 'success' or 'danger'

    useEffect(() => {
        fetchTrialDays();
    }, []);

    const fetchTrialDays = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/admin/settings/DEFAULT_TRIAL_DAYS`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTrialDays(response.data.value);
        } catch (err) {
            console.error("Error fetching trial days:", err);
            setMessage("Failed to fetch current trial days.");
            setMessageType('danger');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);
        setMessageType(null);

        if (isNaN(parseInt(trialDays)) || parseInt(trialDays) <= 0) {
            setMessage("Please enter a valid number of days (greater than 0).");
            setMessageType('danger');
            setSubmitting(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/api/admin/settings/DEFAULT_TRIAL_DAYS`, 
                { value: trialDays },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage("Trial days updated successfully!");
            setMessageType('success');
        } catch (err) {
            console.error("Error updating trial days:", err);
            setMessage("Failed to update trial days.");
            setMessageType('danger');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header as="h5">Manage Sign-up Offer (Free Trial)</Card.Header>
            <Card.Body>
                {message && <Alert variant={messageType}>{message}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="formTrialDays">
                        <Form.Label>Default Free Trial Duration (Days)</Form.Label>
                        <Form.Control
                            type="number"
                            value={trialDays}
                            onChange={(e) => setTrialDays(e.target.value)}
                            placeholder="Enter number of days"
                            min="1"
                            required
                        />
                        <Form.Text className="text-muted">
                            This sets the number of free trial days new users receive upon signing up.
                        </Form.Text>
                    </Form.Group>
                    <Button variant="primary" type="submit" disabled={submitting}>
                        {submitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Save Changes'}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default TrialOfferManagement;