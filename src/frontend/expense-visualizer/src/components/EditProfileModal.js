import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { currencySymbols } from '../utils/currency';

const EditProfileModal = ({ show, handleClose, profile, handleUpdateProfile }) => {
    const [profileName, setProfileName] = useState('');
    const [currency, setCurrency] = useState('');

    useEffect(() => {
        if (profile) {
            setProfileName(profile.name);
            setCurrency(profile.currency);
        }
    }, [profile]);

    const handleSubmit = () => {
        handleUpdateProfile(profile.id, profileName, currency, profile.profile_type);
        handleClose();
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>Edit Profile</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="formProfileName" className="form-floating mb-3">
                        <Form.Control
                            type="text"
                            placeholder="Enter profile name"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                        />
                        <Form.Label>Profile Name</Form.Label>
                    </Form.Group>
                    <Form.Group controlId="formCurrency" className="form-floating mt-2">
                        <Form.Control
                            as="select"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                        >
                            {Object.keys(currencySymbols).map(currencyCode => (
                                <option key={currencyCode} value={currencyCode}>
                                    {currencyCode}
                                </option>
                            ))}
                        </Form.Control>
                        <Form.Label>Currency</Form.Label>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Save Changes
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EditProfileModal;
