import React, { useState, useEffect, forwardRef } from 'react';
import { Table, Form, Button, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { TagFill, ListCheck, PlusCircle } from 'react-bootstrap-icons'; // Import icons

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Custom Input for DatePicker to support floating labels
const CustomDatePickerInput = forwardRef(({ value, onClick, placeholder }, ref) => (
    <Form.Control
        type="text"
        onClick={onClick}
        value={value}
        ref={ref}
        placeholder={placeholder}
        readOnly
    />
));

const DiscountManagement = () => {
    const [discounts, setDiscounts] = useState([]);
    const [newDiscount, setNewDiscount] = useState({
        name: '',
        discount_percentage: '',
        start_date: new Date(),
        end_date: new Date(),
        is_active: true,
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchDiscounts = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/discounts`);
            setDiscounts(response.data);
        } catch (err) {
            setError('Failed to fetch discounts.');
            console.error('Error fetching discounts:', err);
        }
    };

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const handleNewDiscountChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewDiscount(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    const handleDateChange = (name, date) => {
        setNewDiscount(prev => ({ ...prev, [name]: date }));
    };

    const handleAddDiscount = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const payload = {
                ...newDiscount,
                discount_percentage: parseFloat(newDiscount.discount_percentage)
            };
            await axios.post(`${API_BASE_URL}/api/admin/discounts`, payload);
            setSuccess('Successfully added new discount.');
            setNewDiscount({ name: '', discount_percentage: '', start_date: new Date(), end_date: new Date(), is_active: true });
            fetchDiscounts(); // Refresh the list
        } catch (err) {
            setError('Failed to add new discount.');
            console.error('Error adding discount:', err);
        }
    };

    return (
        <div>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Card className="mb-4">
                <Card.Header className="bg-primary text-white d-flex align-items-center">
                    <TagFill className="me-2" />
                    <h5 className="mb-0">Add New Discount</h5>
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleAddDiscount}>
                        <Row className="g-3">
                            <Col md={3}>
                                <Form.Group controlId="formDiscountName" className="form-floating">
                                    <Form.Control type="text" name="name" value={newDiscount.name} onChange={handleNewDiscountChange} placeholder="e.g., Summer Sale" required />
                                    <Form.Label>Discount Name</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group controlId="formDiscountPercentage" className="form-floating">
                                    <Form.Control type="number" name="discount_percentage" value={newDiscount.discount_percentage} onChange={handleNewDiscountChange} placeholder="e.g., 15" required />
                                    <Form.Label>Percentage</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group controlId="formStartDate" className="form-floating">
                                    <DatePicker
                                        selected={newDiscount.start_date}
                                        onChange={(date) => handleDateChange('start_date', date)}
                                        customInput={<CustomDatePickerInput placeholder="Start Date" />}
                                        dateFormat="MM/dd/yyyy"
                                    />
                                    <Form.Label>Start Date</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group controlId="formEndDate" className="form-floating">
                                    <DatePicker
                                        selected={newDiscount.end_date}
                                        onChange={(date) => handleDateChange('end_date', date)}
                                        customInput={<CustomDatePickerInput placeholder="End Date" />}
                                        dateFormat="MM/dd/yyyy"
                                    />
                                    <Form.Label>End Date</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={1} className="d-flex align-items-center">
                                <Form.Group controlId="formIsActive" className="form-check form-switch">
                                    <Form.Check
                                        type="checkbox"
                                        name="is_active"
                                        label="Active"
                                        checked={newDiscount.is_active}
                                        onChange={handleNewDiscountChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Button type="submit" className="w-100">
                                    <PlusCircle className="me-2" />Add Discount
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Card>
                <Card.Header className="bg-primary text-white d-flex align-items-center">
                    <ListCheck className="me-2" />
                    <h5 className="mb-0">Existing Discounts</h5>
                </Card.Header>
                <Card.Body>
                    <Table striped bordered hover responsive className="mt-3">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Percentage</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {discounts.map(discount => (
                                <tr key={discount.id}>
                                    <td>{discount.id}</td>
                                    <td>{discount.name}</td>
                                    <td>{discount.discount_percentage}%</td>
                                    <td>{new Date(discount.start_date).toLocaleDateString()}</td>
                                    <td>{new Date(discount.end_date).toLocaleDateString()}</td>
                                    <td>{discount.is_active ? 'Yes' : 'No'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </div>
    );
};

export default DiscountManagement;
