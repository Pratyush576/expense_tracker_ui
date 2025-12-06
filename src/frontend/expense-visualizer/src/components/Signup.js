import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import authService from '../utils/authService';

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
        <div className="container vh-100 d-flex justify-content-center align-items-center">
            <Card style={{ width: '25rem' }}>
                <Card.Body>
                    <h2 className="text-center mb-4">Sign Up</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}
                    <Form onSubmit={handleSignup}>
                        <Form.Group id="firstName">
                            <Form.Label>First Name</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                Please enter your first name.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group id="lastName">
                            <Form.Label>Last Name</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                Please enter your last name.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                We'll never share your email with anyone else.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group id="mobileNumber">
                            <Form.Label>Mobile Phone Number (Optional)</Form.Label>
                            <Form.Control
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                Enter your mobile phone number (optional).
                            </Form.Text>
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                Password must be 72 characters or fewer.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group id="confirmPassword">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </Form.Group>
                        <Button className="w-100 mt-3" type="submit">
                            Sign Up
                        </Button>
                    </Form>
                </Card.Body>
                <Card.Footer>
                    <div className="w-100 text-center">
                        Already have an account? <Link to="/login">Log In</Link>
                    </div>
                </Card.Footer>
            </Card>
        </div>
    );
};

export default Signup;
