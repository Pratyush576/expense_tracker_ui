import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { currencySymbols } from '../utils/currency';
import { generateHash } from '../utils/hash';

const PROFILE_TYPES = {
    EXPENSE_MANAGER: "EXPENSE_MANAGER",
    ASSET_MANAGER: "ASSET_MANAGER"
};

const CreateProfileModal = ({ show, handleClose, handleCreateProfile }) => {
    const [profileName, setProfileName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [profileType, setProfileType] = useState(PROFILE_TYPES.EXPENSE_MANAGER); // New state for profile type

    const handleSubmit = () => {
        const publicId = generateHash(profileName + Date.now());
        handleCreateProfile(publicId, profileName, currency, profileType); // Pass profileType
        handleClose();
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>Create New Profile</Modal.Title>
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
                    <Form.Group controlId="formProfileType" className="form-floating mt-3">
                        <Form.Control
                            as="select"
                            value={profileType}
                            onChange={(e) => setProfileType(e.target.value)}
                        >
                            {Object.values(PROFILE_TYPES).map(type => (
                                <option key={type} value={type}>
                                    {type.replace('_', ' ')}
                                </option>
                            ))}
                        </Form.Control>
                        <Form.Label>Profile Type</Form.Label>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Create Profile
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CreateProfileModal;
