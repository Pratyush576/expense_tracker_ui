import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ChangePasswordModal = ({ show, handleClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmNewPassword) {
            return setError('New passwords do not match.');
        }
        if (newPassword.length > 72) {
            return setError('New password must be 72 characters or fewer.');
        }

        try {
            await axios.put(`${API_BASE_URL}/api/users/me/password`, {
                old_password: oldPassword,
                new_password: newPassword,
                confirm_new_password: confirmNewPassword,
            });
            setSuccess('Password updated successfully!');
            // Clear form fields
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            // Close modal after a short delay
            setTimeout(() => handleClose(), 1500);
        } catch (err) {
            console.error('Error changing password:', err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Failed to change password.');
            }
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Change Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="formOldPassword">
                        <Form.Label>Old Password</Form.Label>
                        <Form.Control
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formNewPassword">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <Form.Text className="text-muted">
                            Password must be 72 characters or fewer.
                        </Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="formConfirmNewPassword">
                        <Form.Label>Confirm New Password</Form.Label>
                        <Form.Control
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Button variant="primary" type="submit" className="w-100">
                        Change Password
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default ChangePasswordModal;
