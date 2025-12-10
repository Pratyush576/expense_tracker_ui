import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert, Row, Col, Container } from 'react-bootstrap';
import authService from '../utils/authService';
import { CheckCircleFill } from 'react-bootstrap-icons'; // Import an icon for features

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        try {
            await authService.login(email, password);
            onLogin(); // Call onLogin prop to update user state in App.js
            navigate('/');
        } catch (err) {
            console.error('Login error details:', err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Failed to login. Please check your credentials.');
            }
        }
    };

    return (
        <Container fluid className="vh-100 d-flex justify-content-center align-items-center login-page-bg">
            <Row className="w-100 justify-content-center">
                {/* Left Column: Marketing/Informative Section */}
                <Col lg={6} md={8} className="d-none d-md-flex align-items-center justify-content-center p-5">
                    <Card className="shadow-lg p-4 bg-light text-dark" style={{ maxWidth: '600px' }}>
                        <Card.Body>
                            <h1 className="display-4 text-primary mb-4">Take Control of Your Finances</h1>
                            <p className="lead mb-4">
                                Empower yourself with smart financial tracking. Our app helps you manage expenses,
                                track assets, and achieve your financial goals with ease.
                            </p>
                            <ul className="list-unstyled mb-4">
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />Track Expenses Effortlessly</li>
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />Manage Assets Smartly</li>
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />Achieve Financial Goals</li>
                                <li className="mb-2"><CheckCircleFill className="text-success me-2" />Gain Valuable Financial Insights</li>
                            </ul>
                            <div className="text-center">
                                <Link to="/signup">
                                    <Button variant="primary" size="lg">Sign Up Now!</Button>
                                </Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Right Column: Login Form */}
                <Col lg={4} md={8} sm={10} xs={12} className="d-flex align-items-center justify-content-center">
                    <Card className="shadow-lg p-4" style={{ width: '25rem' }}>
                        <Card.Body>
                            <h2 className="text-center mb-4 text-primary">Log In</h2>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <Form onSubmit={handleLogin}>
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
                                <Button className="w-100 mt-3 btn-primary" type="submit">
                                    Log In
                                </Button>
                            </Form>
                            <div className="w-100 text-center mt-3">
                                <Link to="/forgot-password">Forgot Password?</Link>
                            </div>
                        </Card.Body>
                        <Card.Footer className="text-center">
                            Need an account? <Link to="/signup">Sign Up</Link>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;
