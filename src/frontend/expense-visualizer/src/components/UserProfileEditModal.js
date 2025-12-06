import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import authService from '../utils/authService';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const UserProfileEditModal = ({ show, handleClose }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (show) {
            // Fetch current user data when modal opens
            const fetchUserData = async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/users/me`);
                    setFirstName(response.data.user_first_name || '');
                    setLastName(response.data.user_last_name || '');
                    setMobileNumber(response.data.mobile_phone_number || '');
                } catch (err) {
                    console.error('Error fetching user data:', err);
                    setError('Failed to load user data.');
                }
            };
            fetchUserData();
        }
    }, [show]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axios.put(`${API_BASE_URL}/api/users/me`, {
                user_first_name: firstName,
                user_last_name: lastName,
                mobile_phone_number: mobileNumber,
            });
            setSuccess('Profile updated successfully!');
            // Optionally, refresh user data in authService or parent component
            // For now, just close the modal after a short delay
            setTimeout(() => {
                handleClose();
                window.location.reload(); // Reload to reflect changes in MainApp
            }, 1500);
        } catch (err) {
            console.error('Error updating profile:', err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Failed to update profile.');
            }
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Edit Profile</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="formFirstName">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formLastName">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formMobileNumber">
                        <Form.Label>Mobile Phone Number (Optional)</Form.Label>
                        <Form.Control
                            type="tel"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                        />
                    </Form.Group>
                    <Button variant="primary" type="submit" className="w-100">
                        Save Changes
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default UserProfileEditModal;
