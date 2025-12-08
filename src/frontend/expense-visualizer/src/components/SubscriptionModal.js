import React from 'react';
import { Modal, Button, Row, Col, Card } from 'react-bootstrap';

const SubscriptionModal = ({ show, onHide, onSubscribe }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upgrade to Premium</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Choose your plan to unlock all premium features.</p>
        <Row>
          <Col md={6}>
            <Card className="text-center">
              <Card.Body>
                <Card.Title>Monthly</Card.Title>
                <Card.Text>
                  <h2>$10</h2>
                  / month
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
                  <h2>$100</h2>
                  / year
                </Card.Text>
                <Button variant="success" onClick={() => onSubscribe('yearly')}>
                  Choose Yearly
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
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
