import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import axios from 'axios';
import DatePicker from 'react-datepicker';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

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
            <h2>Discount Management</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Card className="mb-4">
                <Card.Header>Add New Discount</Card.Header>
                <Card.Body>
                    <Form onSubmit={handleAddDiscount}>
                        <Row>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Discount Name</Form.Label>
                                    <Form.Control type="text" name="name" value={newDiscount.name} onChange={handleNewDiscountChange} placeholder="e.g., Summer Sale" required />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Percentage</Form.Label>
                                    <Form.Control type="number" name="discount_percentage" value={newDiscount.discount_percentage} onChange={handleNewDiscountChange} placeholder="e.g., 15" required />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Start Date</Form.Label>
                                    <DatePicker selected={newDiscount.start_date} onChange={(date) => handleDateChange('start_date', date)} className="form-control" />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>End Date</Form.Label>
                                    <DatePicker selected={newDiscount.end_date} onChange={(date) => handleDateChange('end_date', date)} className="form-control" />
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Button type="submit" className="w-100">Add Discount</Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <h3 className="mt-4">Existing Discounts</h3>
            <Table striped bordered hover responsive>
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
        </div>
    );
};

export default DiscountManagement;
