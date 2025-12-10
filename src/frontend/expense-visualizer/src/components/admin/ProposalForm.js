import React, { useState, useCallback, forwardRef } from 'react';
import { Form, Button, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import axios from 'axios';
import { PlusCircle, DashCircle, FileEarmarkText, SendFill, CashStack, TagFill, PersonFill } from 'react-bootstrap-icons';
import { v4 as uuidv4 } from 'uuid';
import { currencySymbols } from '../../utils/currency';
import { countryCodes } from '../../utils/country';
import { debounce } from 'lodash';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ProposalForm = () => {
    const [proposal, setProposal] = useState({
        proposal_type: 'price',
        targets: [{ id: uuidv4(), target_type: 'country', target_value: '' }]
    });
    const [pricePayload, setPricePayload] = useState({
        country_code: '',
        price: '',
        currency: ''
    });
    const [discountPayload, setDiscountPayload] = useState({
        discount_name: '',
        percentage: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [targetUserDetails, setTargetUserDetails] = useState({}); // Stores { targetId: { name: 'User Name', error: 'Error message' } }

    const handleProposalChange = (e) => {
        const { name, value } = e.target;
        setProposal(prev => ({ ...prev, [name]: value }));
    };

    const handlePricePayloadChange = (e) => {
        const { name, value } = e.target;
        setPricePayload(prev => ({ ...prev, [name]: value }));
    };

    const handleDiscountPayloadChange = (e) => {
        const { name, value } = e.target;
        setDiscountPayload(prev => ({ ...prev, [name]: value }));
    };

    const fetchUserDetails = useCallback(
        debounce(async (userId, targetId) => {
            if (!userId) {
                setTargetUserDetails(prev => ({ ...prev, [targetId]: { name: '', error: '' } }));
                return;
            }
            try {
                const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).access_token : null;
                const response = await axios.get(`${API_BASE_URL}/api/manager/users/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setTargetUserDetails(prev => ({
                    ...prev,
                    [targetId]: { name: `${response.data.user_first_name} ${response.data.user_last_name}`, error: '' }
                }));
            } catch (err) {
                setTargetUserDetails(prev => ({
                    ...prev,
                    [targetId]: { name: '', error: 'User not found' }
                }));
            }
        }, 500),
        []
    );

    const handleTargetChange = (id, e) => {
        const { name, value } = e.target;
        const newTargets = proposal.targets.map(target => 
            target.id === id ? { ...target, [name]: value } : target
        );
        setProposal(prev => ({ ...prev, targets: newTargets }));

        if (name === 'target_value' && newTargets.find(t => t.id === id)?.target_type === 'specific_user') {
            fetchUserDetails(value, id);
        } else if (name === 'target_type' && value !== 'specific_user') {
            setTargetUserDetails(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        }
    };

    const addTarget = () => {
        setProposal(prev => ({
            ...prev,
            targets: [...prev.targets, { id: uuidv4(), target_type: 'country', target_value: '' }]
        }));
    };

    const removeTarget = (id) => {
        if (proposal.targets.length > 1) {
            setProposal(prev => ({
                ...prev,
                targets: prev.targets.filter(target => target.id !== id)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            let finalPayload = {};
            if (proposal.proposal_type === 'price') {
                finalPayload = {
                    country_code: pricePayload.country_code,
                    price: parseFloat(pricePayload.price),
                    currency: pricePayload.currency
                };
            } else if (proposal.proposal_type === 'discount') {
                finalPayload = {
                    discount_name: discountPayload.discount_name,
                    percentage: parseFloat(discountPayload.percentage)
                };
            }

            const finalProposal = {
                ...proposal,
                payload: finalPayload,
                targets: proposal.targets.map(({ id, ...rest }) => rest) // Remove temporary id
            };

            await axios.post(`${API_BASE_URL}/api/manager/proposals`, finalProposal);
            setSuccess('Proposal submitted successfully!');
            // Reset form
            setProposal({
                proposal_type: 'price',
                targets: [{ id: uuidv4(), target_type: 'country', target_value: '' }]
            });
            setPricePayload({
                country_code: '',
                price: '',
                currency: ''
            });
            setDiscountPayload({
                discount_name: '',
                percentage: ''
            });
        } catch (err) {
            console.error('Error submitting proposal:', err);
            setError(err.message || 'Failed to submit proposal. Ensure payload is valid JSON.');
        }
    };

    return (
        <Card className="mb-4">
            <Card.Header className="bg-primary text-white d-flex align-items-center">
                <FileEarmarkText className="me-2" />
                <h5 className="mb-0">Create New Proposal</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Row className="mb-3 g-3">
                        <Col md={6}>
                            <Form.Group controlId="formProposalType" className="form-floating">
                                <Form.Select name="proposal_type" value={proposal.proposal_type} onChange={handleProposalChange}>
                                    <option value="price">Price Change</option>
                                    <option value="discount">New Discount</option>
                                </Form.Select>
                                <Form.Label>Proposal Type</Form.Label>
                            </Form.Group>
                        </Col>
                    </Row>

                    {proposal.proposal_type === 'price' && (
                        <>
                            <h5 className="mt-4 mb-3 d-flex align-items-center"><CashStack className="me-2" />Price Change Payload</h5>
                            <Row className="mb-3 g-3">
                                <Col md={4}>
                                    <Form.Group controlId="formPriceCountryCode" className="form-floating">
                                        <Form.Select
                                            name="country_code"
                                            value={pricePayload.country_code}
                                            onChange={handlePricePayloadChange}
                                        >
                                            <option value="">Select Country</option>
                                            {countryCodes.map(country => (
                                                <option key={country.code} value={country.code}>
                                                    {country.name} ({country.code})
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Label>Country Code</Form.Label>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group controlId="formPriceAmount" className="form-floating">
                                        <Form.Control
                                            type="number"
                                            name="price"
                                            value={pricePayload.price}
                                            onChange={handlePricePayloadChange}
                                            placeholder="e.g., 9.99"
                                            step="0.01"
                                        />
                                        <Form.Label>Price</Form.Label>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group controlId="formPriceCurrency" className="form-floating">
                                        <Form.Select
                                            name="currency"
                                            value={pricePayload.currency}
                                            onChange={handlePricePayloadChange}
                                        >
                                            <option value="">Select Currency</option>
                                            {Object.keys(currencySymbols).map(currencyCode => (
                                                <option key={currencyCode} value={currencyCode}>
                                                    {currencyCode}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Label>Currency</Form.Label>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </>
                    )}

                    {proposal.proposal_type === 'discount' && (
                        <>
                            <h5 className="mt-4 mb-3 d-flex align-items-center"><TagFill className="me-2" />New Discount Payload</h5>
                            <Row className="mb-3 g-3">
                                <Col md={6}>
                                    <Form.Group controlId="formDiscountName" className="form-floating">
                                        <Form.Control
                                            type="text"
                                            name="discount_name"
                                            value={discountPayload.discount_name}
                                            onChange={handleDiscountPayloadChange}
                                            placeholder="e.g., Summer Sale"
                                        />
                                        <Form.Label>Discount Name</Form.Label>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group controlId="formDiscountPercentage" className="form-floating">
                                        <Form.Control
                                            type="number"
                                            name="percentage"
                                            value={discountPayload.percentage}
                                            onChange={handleDiscountPayloadChange}
                                            placeholder="e.g., 0.15 (for 15%)"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                        />
                                        <Form.Label>Percentage</Form.Label>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </>
                    )}
                    
                    <h5 className="mt-4 mb-3 d-flex align-items-center"><PersonFill className="me-2" />Targets</h5>
                    {proposal.targets.map((target, index) => (
                        <Row key={target.id} className="mb-2 align-items-center g-3">
                            <Col md={5}>
                                <Form.Group controlId={`formTargetType-${target.id}`} className="form-floating">
                                    <Form.Select name="target_type" value={target.target_type} onChange={(e) => handleTargetChange(target.id, e)}>
                                        <option value="country">Country</option>
                                        <option value="specific_user">Specific User</option>
                                        <option value="all_users">All Users</option>
                                    </Form.Select>
                                    <Form.Label>Target Type</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={5}>
                                {target.target_type === 'country' ? (
                                    <Form.Group controlId={`formTargetValueCountry-${target.id}`} className="form-floating">
                                        <Form.Select
                                            name="target_value"
                                            value={target.target_value}
                                            onChange={(e) => handleTargetChange(target.id, e)}
                                        >
                                            <option value="">Select Country</option>
                                            {countryCodes.map(country => (
                                                <option key={country.code} value={country.code}>
                                                    {country.name} ({country.code})
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Label>Target Value</Form.Label>
                                    </Form.Group>
                                ) : (
                                    <Form.Group controlId={`formTargetValueUser-${target.id}`} className="form-floating">
                                        <Form.Control 
                                            type="text" 
                                            name="target_value" 
                                            value={target.target_value} 
                                            onChange={(e) => handleTargetChange(target.id, e)}
                                            placeholder={target.target_type === 'specific_user' ? "Enter user_id" : "e.g., US"}
                                            disabled={target.target_type === 'all_users'}
                                        />
                                        <Form.Label>Target Value</Form.Label>
                                        {target.target_type === 'specific_user' && target.target_value && (
                                            <div className="mt-1">
                                                {targetUserDetails[target.id]?.name && (
                                                    <Alert variant="success" className="py-1 px-2" style={{fontSize: '0.8rem'}}>
                                                        User: {targetUserDetails[target.id].name}
                                                    </Alert>
                                                )}
                                                {targetUserDetails[target.id]?.error && (
                                                    <Alert variant="danger" className="py-1 px-2" style={{fontSize: '0.8rem'}}>
                                                        {targetUserDetails[target.id].error}
                                                    </Alert>
                                                )}
                                            </div>
                                        )}
                                    </Form.Group>
                                )}
                            </Col>
                            <Col md={2} className="d-flex align-items-center">
                                {proposal.targets.length > 1 && <Button variant="danger" size="sm" onClick={() => removeTarget(target.id)}><DashCircle /></Button>}
                            </Col>
                        </Row>
                    ))}
                    <Button variant="secondary" size="sm" onClick={addTarget} className="mt-2">
                        <PlusCircle className="me-2" />Add Target
                    </Button>
                    
                    <hr />
                    <Button variant="primary" type="submit" className="w-100">
                        <SendFill className="me-2" />Submit Proposal
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default ProposalForm;
