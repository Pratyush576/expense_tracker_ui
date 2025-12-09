import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import axios from 'axios';
import { countryCodes } from '../../utils/country';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const PriceManagement = () => {
    const [prices, setPrices] = useState([]);
    const [newPrice, setNewPrice] = useState({
        country_code: '',
        subscription_type: 'monthly',
        price: '',
        currency: 'USD'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchPrices = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/pricing`);
            setPrices(response.data);
        } catch (err) {
            setError('Failed to fetch prices.');
            console.error('Error fetching prices:', err);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    const handleNewPriceChange = (e) => {
        const { name, value } = e.target;
        setNewPrice(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPrice = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await axios.post(`${API_BASE_URL}/api/admin/pricing`, newPrice);
            setSuccess('Successfully added new price.');
            setNewPrice({ country_code: '', subscription_type: 'monthly', price: '', currency: 'USD' });
            fetchPrices(); // Refresh the list
        } catch (err) {
            setError('Failed to add new price.');
            console.error('Error adding price:', err);
        }
    };

    return (
        <div>
            <h2>Geographic Price Management</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Card className="mb-4">
                <Card.Header>Add New Price</Card.Header>
                <Card.Body>
                    <Form onSubmit={handleAddPrice}>
                        <Row>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Country Code</Form.Label>
                                    <Form.Select name="country_code" value={newPrice.country_code} onChange={handleNewPriceChange} required>
                                        <option value="">Select Country</option>
                                        {countryCodes.map(country => (
                                            <option key={country.code} value={country.code}>
                                                {country.name} ({country.code})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Subscription Type</Form.Label>
                                    <Form.Select name="subscription_type" value={newPrice.subscription_type} onChange={handleNewPriceChange}>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Price</Form.Label>
                                    <InputGroup>
                                        <Form.Control type="number" name="price" value={newPrice.price} onChange={handleNewPriceChange} placeholder="e.g., 9.99" required />
                                        <InputGroup.Text>{newPrice.currency}</InputGroup.Text>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col md={3} className="d-flex align-items-end">
                                <Button type="submit" className="w-100">Add Price</Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <h3 className="mt-4">Existing Prices</h3>
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Country Code</th>
                        <th>Subscription Type</th>
                        <th>Price</th>
                        <th>Currency</th>
                    </tr>
                </thead>
                <tbody>
                    {prices.map(price => (
                        <tr key={price.id}>
                            <td>{price.id}</td>
                            <td>{price.country_code}</td>
                            <td>{price.subscription_type}</td>
                            <td>{price.price}</td>
                            <td>{price.currency}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

export default PriceManagement;
