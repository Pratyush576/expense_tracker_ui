import React, { useState, useEffect } from 'react';
import { Form, Button, Card, ListGroup, Alert, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { CreditCardFill, PlusCircle, Trash } from 'react-bootstrap-icons'; // Import icons

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const PaymentType = {
    CREDIT_CARD: "Credit Card",
    DEBIT_CARD: "Debit Card",
    ONLINE_BANKING: "Online Banking",
    CASH: "Cash",
    OTHER: "Other"
};

function PaymentSourceManager({ profileId }) {
    const [paymentSources, setPaymentSources] = useState([]);
    const [newPaymentSource, setNewPaymentSource] = useState({
        payment_type: PaymentType.OTHER,
        source_name: '',
        note: ''
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (profileId) {
            fetchPaymentSources();
        }
    }, [profileId]);

    const fetchPaymentSources = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/profiles/${profileId}/payment_sources`);
            setPaymentSources(response.data);
        } catch (err) {
            console.error("Error fetching payment sources:", err);
            setError("Failed to fetch payment sources.");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewPaymentSource(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!newPaymentSource.source_name) {
            setError("Payment Source Name is required.");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/api/payment_sources`, {
                ...newPaymentSource,
                profile_id: profileId
            });
            setSuccess("Payment source added successfully!");
            setNewPaymentSource({ payment_type: PaymentType.OTHER, source_name: '', note: '' });
            fetchPaymentSources(); // Refresh the list
        } catch (err) {
            console.error("Error adding payment source:", err);
            setError(err.response?.data?.detail || "Failed to add payment source.");
        }
    };

    const handleDelete = async (id) => {
        setError(null);
        setSuccess(null);
        if (window.confirm("Are you sure you want to delete this payment source?")) {
            try {
                await axios.delete(`${API_BASE_URL}/api/payment_sources/${id}`);
                setSuccess("Payment source deleted successfully!");
                fetchPaymentSources(); // Refresh the list
            } catch (err) {
                console.error("Error deleting payment source:", err);
                setError(err.response?.data?.detail || "Failed to delete payment source.");
            }
        }
    };

    return (
        <Card className="mb-4">
            <Card.Header className="bg-primary text-white d-flex align-items-center">
                <CreditCardFill className="me-2" />
                <h5 className="mb-0">Manage Payment Sources</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handleSubmit} className="mb-4">
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Group className="form-floating" controlId="floatingPaymentType">
                                <Form.Control
                                    as="select"
                                    name="payment_type"
                                    value={newPaymentSource.payment_type}
                                    onChange={handleChange}
                                >
                                    {Object.values(PaymentType).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </Form.Control>
                                <Form.Label>Payment Type</Form.Label>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="form-floating" controlId="floatingSourceName">
                                <Form.Control
                                    type="text"
                                    name="source_name"
                                    value={newPaymentSource.source_name}
                                    onChange={handleChange}
                                    placeholder="e.g., Visa ending in 1234, My Bank Account"
                                    required
                                />
                                <Form.Label>Payment Source Name</Form.Label>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="form-floating" controlId="floatingNote">
                                <Form.Control
                                    as="textarea"
                                    name="note"
                                    value={newPaymentSource.note}
                                    onChange={handleChange}
                                    rows={1} // Adjusted rows for floating label
                                    placeholder="Any additional notes"
                                    style={{ minHeight: '58px' }} // Ensure enough height for floating label
                                />
                                <Form.Label>Note (Optional)</Form.Label>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Button variant="primary" type="submit" className="mt-3">
                        <PlusCircle className="me-2" />Add Payment Source
                    </Button>
                </Form>

                <h5 className="mt-4">Existing Payment Sources</h5>
                {paymentSources.length === 0 ? (
                    <Alert variant="info" className="text-center">
                        No payment sources added yet. Use the form above to add your first payment source.
                    </Alert>
                ) : (
                    <ListGroup>
                        {paymentSources.map(source => (
                            <ListGroup.Item key={source.id} className="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>{source.source_name}</strong> ({source.payment_type})
                                    {source.note && <p className="text-muted mb-0">{source.note}</p>}
                                </div>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(source.id)}>
                                    <Trash />
                                </Button>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Card.Body>
        </Card>
    );
}

export default PaymentSourceManager;
