import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Table } from 'react-bootstrap';
import axios from 'axios';
import EditProfileModal from './EditProfileModal'; // Import EditProfileModal
import ConfirmationModal from '../ConfirmationModal'; // Import ConfirmationModal

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ManageProfilesModal = ({ show, handleClose, onProfileVisibilityChange, handleUpdateProfile, handleDeleteProfile }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [selectedProfileForEdit, setSelectedProfileForEdit] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedProfileForDelete, setSelectedProfileForDelete] = useState(null);

    const fetchProfiles = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch all profiles, including hidden ones
            const response = await axios.get(`${API_BASE_URL}/api/profiles?include_hidden=true`);
            setProfiles(response.data);
        } catch (err) {
            setError("Failed to fetch profiles.");
            console.error("Error fetching profiles:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchProfiles();
        }
    }, [show]);

    const handleToggleVisibility = async (profileId, currentVisibility) => {
        setError(null);
        setSuccess(null);
        try {
            await axios.put(`${API_BASE_URL}/api/profiles/${profileId}`, { is_hidden: !currentVisibility });
            setSuccess("Profile visibility updated successfully!");
            fetchProfiles(); // Refresh the list
            onProfileVisibilityChange(); // Notify parent to refresh data
        } catch (err) {
            setError("Failed to update profile visibility.");
            console.error("Error updating profile visibility:", err);
        }
    };

    const handleEditClick = (profile) => {
        setSelectedProfileForEdit(profile);
        setShowEditProfileModal(true);
    };

    const handleDeleteClick = (profile) => {
        setSelectedProfileForDelete(profile);
        setShowConfirmModal(true);
    };

    const confirmDelete = () => {
        handleDeleteProfile(selectedProfileForDelete.id);
        setShowConfirmModal(false);
        setSuccess("Profile deleted successfully!");
        fetchProfiles(); // Refresh the list after deletion
        onProfileVisibilityChange(); // Notify parent to refresh data
    };

    return (
        <>
            <Modal show={show} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Manage Profiles</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loading && <Alert variant="info">Loading profiles...</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    {!loading && profiles.length === 0 && (
                        <Alert variant="info">No profiles found.</Alert>
                    )}

                    {!loading && profiles.length > 0 && (
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>Profile Name</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {profiles.map(profile => (
                                    <tr key={profile.id}>
                                        <td>{profile.name}</td>
                                        <td>{profile.is_hidden ? 'Hidden' : 'Visible'}</td>
                                        <td>
                                            <Button
                                                variant={profile.is_hidden ? 'success' : 'warning'}
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleToggleVisibility(profile.id, profile.is_hidden)}
                                            >
                                                {profile.is_hidden ? 'Unhide' : 'Hide'}
                                            </Button>
                                            <Button
                                                variant="info"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleEditClick(profile)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDeleteClick(profile)}
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {selectedProfileForEdit && (
                <EditProfileModal
                    show={showEditProfileModal}
                    handleClose={() => setShowEditProfileModal(false)}
                    profile={selectedProfileForEdit}
                    handleUpdateProfile={(profileId, newName, newCurrency, newProfileType) => {
                        handleUpdateProfile(profileId, newName, newCurrency, newProfileType);
                        setShowEditProfileModal(false);
                        setSuccess("Profile updated successfully!");
                        fetchProfiles(); // Refresh the list after update
                        onProfileVisibilityChange(); // Notify parent to refresh data
                    }}
                />
            )}

            {selectedProfileForDelete && (
                <ConfirmationModal
                    show={showConfirmModal}
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete the profile "${selectedProfileForDelete?.name}"? This action cannot be undone.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}
        </>
    );
};

export default ManageProfilesModal;
