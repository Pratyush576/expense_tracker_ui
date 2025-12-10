import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Row, Col, Container } from 'react-bootstrap';
import authService from '../utils/authService';
import { CheckCircleFill } from 'react-bootstrap-icons'; // Import an icon for features

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobileNumber, setMobileNumber] = useState(''); // New state for mobile number
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        try {
            await authService.signup(email, password, firstName, lastName, mobileNumber); // Pass mobileNumber
            setSuccess('Account created successfully! Please log in.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Failed to create an account.');
            }
        }
    };

    return (
        <Container fluid className="vh-100 d-flex justify-content-center align-items-center signup-page-bg">
            <Row className="w-100 justify-content-center">
                {/* Left Column: Marketing/Informative Section */}
                <Col lg={6} md={8} className="d-none d-md-flex align-items-center justify-content-center p-5">
                    <Card className="shadow-lg p-4 bg-light text-dark" style={{ maxWidth: '600px' }}>
                        <Card.Body>
                            <h1 className="display-4 text-primary mb-4">Start Your Financial Journey Today!</h1>
                            <p className="lead mb-4">
                                Join thousands of users who are taking control of their money.
                                Sign up now to unlock powerful features and achieve financial peace of mind.
                            </p>
                            <ul className="list-unstyled mb-4">
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />Quick and Easy Setup</li>
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />Personalized Financial Insights</li>
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />Secure Data Management</li>
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />24/7 Access to Your Financial Data</li>
                            </ul>
                            <div className="text-center">
                                Already have an account? <Link to="/login" className="btn btn-outline-primary mt-2">Log In</Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Right Column: Signup Form */}
                <Col lg={4} md={8} sm={10} xs={12} className="d-flex align-items-center justify-content-center">
                    <Card className="shadow-lg p-4" style={{ width: '25rem' }}>
                        <Card.Body>
                            <h2 className="text-center mb-4 text-primary">Sign Up</h2>
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}
                            <Form onSubmit={handleSignup}>
                                <Form.Group className="form-floating mb-3" controlId="floatingFirstName">
                                    <Form.Control
                                        type="text"
                                        placeholder="First Name"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                    <Form.Label>First Name</Form.Label>
                                </Form.Group>
                                <Form.Group className="form-floating mb-3" controlId="floatingLastName">
                                    <Form.Control
                                        type="text"
                                        placeholder="Last Name"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                    <Form.Label>Last Name</Form.Label>
                                </Form.Group>
                                <Form.Group className="form-floating mb-3" controlId="floatingEmail">
                                    <Form.Control
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <Form.Label>Email address</Form.Label>
                                </Form.Group>
                                <Form.Group className="form-floating mb-3" controlId="floatingMobileNumber">
                                    <Form.Control
                                        type="tel"
                                        placeholder="Mobile Phone Number (Optional)"
                                        value={mobileNumber}
                                        onChange={(e) => setMobileNumber(e.target.value)}
                                    />
                                    <Form.Label>Mobile Phone Number (Optional)</Form.Label>
                                </Form.Group>
                                <Form.Group className="form-floating mb-3" controlId="floatingPassword">
                                    <Form.Control
                                        type="password"
                                        placeholder="Password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <Form.Label>Password</Form.Label>
                                </Form.Group>
                                <Form.Group className="form-floating mb-3" controlId="floatingConfirmPassword">
                                    <Form.Control
                                        type="password"
                                        placeholder="Confirm Password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <Form.Label>Confirm Password</Form.Label>
                                </Form.Group>
                                <Button className="w-100 mt-3 btn-primary" type="submit">
                                    Sign Up
                                </Button>
                            </Form>
                        </Card.Body>
                        <Card.Footer className="text-center">
                            Already have an account? <Link to="/login">Log In</Link>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Signup;
