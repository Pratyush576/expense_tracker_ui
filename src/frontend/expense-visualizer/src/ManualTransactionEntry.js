import React, { useState, useEffect, forwardRef } from 'react';
import { Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Custom Input for DatePicker to work with Bootstrap Form.Control and Floating Labels
const CustomDatePickerInput = forwardRef((props, ref) => (
    <Form.Control
        type="text"
        {...props} // Spread all props from DatePicker
        ref={ref} // Explicitly pass the forwarded ref
    />
));

function ManualTransactionEntry({ profileId, categories, paymentSources, onTransactionAdded }) {
    const [transaction, setTransaction] = useState({
        date: new Date(),
        description: '',
        amount: '',
        payment_source: '',
        category: '',
        subcategory: ''
    });
    const [availableSubcategories, setAvailableSubcategories] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (transaction.category && categories) {
            const selectedCategory = categories.find(cat => cat.name === transaction.category);
            if (selectedCategory) {
                setAvailableSubcategories(selectedCategory.subcategories);
            } else {
                setAvailableSubcategories([]);
            }
        } else {
            setAvailableSubcategories([]);
        }
    }, [transaction.category, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTransaction(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date) => {
        setTransaction(prev => ({ ...prev, date: date }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Basic validation
        if (!transaction.date || !transaction.description || !transaction.amount || !transaction.payment_source || !transaction.category) {
            setError("Please fill in all required fields (Date, Description, Amount, Payment Source, Category).");
            return;
        }
        if (isNaN(parseFloat(transaction.amount))) {
            setError("Amount must be a valid number.");
            return;
        }

        const formattedDate = transaction.date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });

        const transactionData = {
            ...transaction,
            date: formattedDate,
            amount: parseFloat(transaction.amount),
            profile_id: profileId
        };

        try {
            await axios.post(`${API_BASE_URL}/api/transactions`, transactionData);
            setSuccess("Transaction added successfully!");
            setTransaction({
                date: new Date(),
                description: '',
                amount: '',
                payment_source: '',
                category: '',
                subcategory: ''
            });
            if (onTransactionAdded) {
                onTransactionAdded(); // Notify parent to refresh data
            }
        } catch (err) {
            console.error("Error adding transaction:", err);
            setError(err.response?.data?.detail || "Failed to add transaction.");
        }
    };

    return (
        <Card className="mb-4">
            <Card.Header>Manual Transaction Entry</Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Row className="mb-3">
                        <Col>
                            <div className="form-floating mb-3">
                                <DatePicker
                                    selected={transaction.date}
                                    onChange={handleDateChange}
                                    dateFormat="MM/dd/yyyy"
                                    id="formDate" // Add an ID for the label
                                    required
                                    customInput={<CustomDatePickerInput placeholder="Select Date" id="formDate" required />}
                                />
                                <label htmlFor="formDate">Date</label>
                            </div>
                        </Col>

                        <Col>
                            <div className="form-floating mb-3">
                                <Form.Control
                                    type="text"
                                    name="description"
                                    value={transaction.description}
                                    onChange={handleChange}
                                    placeholder="Enter description"
                                    id="formDescription"
                                    required
                                />
                                <Form.Label htmlFor="formDescription">Description</Form.Label>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col>
                            <div className="form-floating mb-3">
                                <Form.Control
                                    type="number"
                                    name="amount"
                                    value={transaction.amount}
                                    onChange={handleChange}
                                    placeholder="Enter amount"
                                    step="0.01"
                                    id="formAmount"
                                    required
                                />
                                <Form.Label htmlFor="formAmount">Amount</Form.Label>
                            </div>
                        </Col>

                        <Col>
                            <div className="form-floating mb-3">
                                <Form.Control
                                    as="select"
                                    name="payment_source"
                                    value={transaction.payment_source}
                                    onChange={handleChange}
                                    id="formPaymentSource"
                                    required
                                >
                                    <option value="">Select Payment Source</option>
                                    {paymentSources.map((source, index) => (
                                        <option key={index} value={source}>{source}</option>
                                    ))}
                                </Form.Control>
                                <Form.Label htmlFor="formPaymentSource">Payment Source</Form.Label>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col>
                            <div className="form-floating mb-3">
                                <Form.Control
                                    as="select"
                                    name="category"
                                    value={transaction.category}
                                    onChange={handleChange}
                                    id="formCategory"
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat, index) => (
                                        <option key={index} value={cat.name}>{cat.name}</option>
                                    ))}
                                </Form.Control>
                                <Form.Label htmlFor="formCategory">Category</Form.Label>
                            </div>
                        </Col>

                        <Col>
                            <div className="form-floating mb-3">
                                <Form.Control
                                    as="select"
                                    name="subcategory"
                                    value={transaction.subcategory}
                                    onChange={handleChange}
                                    id="formSubcategory"
                                    disabled={!transaction.category || availableSubcategories.length === 0}
                                >
                                    <option value="">Select Subcategory</option>
                                    {availableSubcategories.map((subcat, index) => (
                                        <option key={index} value={subcat}>{subcat}</option>
                                    ))}
                                </Form.Control>
                                <Form.Label htmlFor="formSubcategory">Subcategory (Optional)</Form.Label>
                            </div>
                        </Col>
                    </Row>

                    <Button variant="primary" type="submit">
                        Add Transaction
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
}

export default ManualTransactionEntry;
