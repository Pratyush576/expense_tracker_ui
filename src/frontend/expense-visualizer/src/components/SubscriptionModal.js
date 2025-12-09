import React, { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { formatCurrency } from '../utils/currency';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const SubscriptionModal = ({ show, onHide, onSubscribe }) => {
  const [monthlyPrice, setMonthlyPrice] = useState(null);
  const [yearlyPrice, setYearlyPrice] = useState(null);
  const [activeDiscount, setActiveDiscount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPricingAndDiscounts = async () => {
      if (!show) return;

      setLoading(true);
      setError('');
      try {
        // Fetch geographic prices
        const pricingResponse = await axios.get(`${API_BASE_URL}/api/pricing`);
        const pricesData = pricingResponse.data;

        // For simplicity, assume 'US' or pick the first available price for now
        // In a real app, you'd determine the user's country
        const usMonthly = pricesData.find(p => p.country_code === 'US' && p.subscription_type === 'monthly');
        const usYearly = pricesData.find(p => p.country_code === 'US' && p.subscription_type === 'yearly');

        setMonthlyPrice(usMonthly || { price: 10, currency: 'USD' }); // Fallback to hardcoded
        setYearlyPrice(usYearly || { price: 100, currency: 'USD' }); // Fallback to hardcoded

        // Fetch active discounts
        const discountsResponse = await axios.get(`${API_BASE_URL}/api/discounts`);
        const discountsData = discountsResponse.data;

        // Find an active discount (e.g., the first one that is active)
        const now = new Date();
        const currentActiveDiscount = discountsData.find(d => 
          d.is_active && new Date(d.start_date) <= now && new Date(d.end_date) >= now
        );
        setActiveDiscount(currentActiveDiscount);

      } catch (err) {
        console.error('Error fetching pricing or discounts:', err);
        setError('Failed to load pricing information. Please try again later.');
        // Fallback to hardcoded prices if API fails
        setMonthlyPrice({ price: 10, currency: 'USD' });
        setYearlyPrice({ price: 100, currency: 'USD' });
      } finally {
        setLoading(false);
      }
    };

    fetchPricingAndDiscounts();
  }, [show]); // Re-fetch when modal visibility changes

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upgrade to Premium</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading prices...</span>
            </Spinner>
            <p>Loading pricing information...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (
          <>
            <p>Choose your plan to unlock all premium features.</p>
            {activeDiscount && (
              <Alert variant="info" className="text-center">
                <strong>Special Offer:</strong> Get {activeDiscount.discount_percentage}% off!
              </Alert>
            )}
            <Row>
              <Col md={6}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Monthly</Card.Title>
                    <Card.Text>
                      {monthlyPrice && (
                        <>
                          {activeDiscount ? (
                            <>
                              <h2 className="text-muted text-decoration-line-through">
                                {formatCurrency(monthlyPrice.price, monthlyPrice.currency)}
                              </h2>
                              <h2>
                                {formatCurrency(monthlyPrice.price * (1 - activeDiscount.discount_percentage/100), monthlyPrice.currency)}
                              </h2>
                            </>
                          ) : (
                            <h2>{formatCurrency(monthlyPrice.price, monthlyPrice.currency)}</h2>
                          )}
                          / month
                        </>
                      )}
                    </Card.Text>
                    <Button variant="primary" onClick={() => onSubscribe('monthly')}>
                      Choose Monthly
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Yearly</Card.Title>
                    <Card.Text>
                      {yearlyPrice && (
                        <>
                          {activeDiscount ? (
                            <>
                              <h2 className="text-muted text-decoration-line-through">
                                {formatCurrency(yearlyPrice.price, yearlyPrice.currency)}
                              </h2>
                              <h2>
                                {formatCurrency(yearlyPrice.price * (1 - activeDiscount.discount_percentage/100), yearlyPrice.currency)}
                              </h2>
                            </>
                          ) : (
                            <h2>{formatCurrency(yearlyPrice.price, yearlyPrice.currency)}</h2>
                          )}
                          / year
                        </>
                      )}
                    </Card.Text>
                    <Button variant="success" onClick={() => onSubscribe('yearly')}>
                      Choose Yearly
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SubscriptionModal;
