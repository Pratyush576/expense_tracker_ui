import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Table, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { PersonPlusFill, PersonDashFill } from 'react-bootstrap-icons';
import ConfirmationModal from '../../ConfirmationModal'; // Import ConfirmationModal

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const WhitelistedUserRoleManagement = ({ currentUser }) => {
    const [whitelistedUsers, setWhitelistedUsers] = useState([]);
    const [newUserId, setNewUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null); // 'success' or 'danger'

    // State for confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalTitle, setConfirmModalTitle] = useState('');
    const [confirmModalMessage, setConfirmModalMessage] = useState('');
    const [confirmModalAction, setConfirmModalAction] = useState(null);

    const isAdmin = currentUser?.role === 'ADMIN';
    const isManager = currentUser?.role === 'MANAGER';
    const canRemove = isAdmin; // Only Admin can remove users from whitelist
    const canAssignRole = isAdmin; // Only Admin can assign roles

    useEffect(() => {
        fetchWhitelistedUsers();
    }, []);

    const fetchWhitelistedUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/admin/whitelist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWhitelistedUsers(response.data); // Expecting WhitelistedUserResponse objects
        } catch (err) {
            console.error("Error fetching whitelisted users:", err);
            setMessage("Failed to fetch current whitelisted users.");
            setMessageType('danger');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);
        setMessageType(null);

        if (!newUserId || isNaN(parseInt(newUserId))) {
            setMessage("Please enter a valid User ID.");
            setMessageType('danger');
            setSubmitting(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/admin/whitelist/add`, 
                { user_id: parseInt(newUserId) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(`User ID ${newUserId} added to whitelist successfully!`);
            setMessageType('success');
            setNewUserId('');
            fetchWhitelistedUsers(); // Refresh the list
        } catch (err) {
            console.error("Error adding user to whitelist:", err);
            setMessage(err.response?.data?.detail || "Failed to add user to whitelist.");
            setMessageType('danger');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveUser = async (userId, userRole) => {
        setSubmitting(true);
        setMessage(null);
        setMessageType(null);

        if (userRole === 'ADMIN' || userRole === 'MANAGER') {
            setMessage("Admin or Manager users cannot be removed from the whitelisted list.");
            setMessageType('danger');
            setSubmitting(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/api/admin/whitelist/remove/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage(`User ID ${userId} removed from whitelist successfully!`);
            setMessageType('success');
            fetchWhitelistedUsers(); // Refresh the list
        } catch (err) {
            console.error("Error removing user from whitelist:", err);
            setMessage(err.response?.data?.detail || "Failed to remove user from whitelist.");
            setMessageType('danger');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignRole = async (userId, newRole) => {
        setSubmitting(true);
        setMessage(null);
        setMessageType(null);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/assign-role`, 
                { role: newRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(`Role for User ID ${userId} updated to ${newRole} successfully!`);
            setMessageType('success');
            fetchWhitelistedUsers(); // Refresh the list to show updated role
        } catch (err) {
            console.error("Error assigning role:", err);
            setMessage(err.response?.data?.detail || "Failed to assign role.");
            setMessageType('danger');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRoleChangeRequest = (userId, currentRole, newRole) => {
        if (!canAssignRole) {
            setMessage("You do not have permission to assign roles.");
            setMessageType('danger');
            return;
        }

        setConfirmModalTitle('Confirm Role Change');
        setConfirmModalMessage(`Are you sure you want to change the role of User ID ${userId} from ${currentRole} to ${newRole}?`);
        setConfirmModalAction(() => () => handleAssignRole(userId, newRole));
        setShowConfirmModal(true);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <Card className="shadow-sm mb-4">
            <Card.Header as="h5">Whitelisted User Role Management</Card.Header>
            <Card.Body>
                {message && <Alert variant={messageType}>{message}</Alert>}

                <Form onSubmit={handleAddUser} className="mb-4">
                    <Form.Group controlId="newUserId" className="mb-3">
                        <Form.Label>Add User to Whitelist by ID</Form.Label>
                        <InputGroup>
                            <Form.Control
                                type="number"
                                value={newUserId}
                                onChange={(e) => setNewUserId(e.target.value)}
                                placeholder="Enter User ID"
                                min="1"
                                required
                            />
                            <Button variant="success" type="submit" disabled={submitting}>
                                {submitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : <><PersonPlusFill className="me-2" />Add User</>}
                            </Button>
                        </InputGroup>
                        <Form.Text className="text-muted">
                            Enter the ID of the user you wish to grant premium access.
                        </Form.Text>
                    </Form.Group>
                </Form>

                <h5>Current Whitelisted Users</h5>
                {whitelistedUsers.length > 0 ? (
                    <Table striped bordered hover responsive className="mt-3">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th>Email</th>
                                <th>Phone Number</th>
                                <th>Role</th>
                                <th>Whitelisted Since</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {whitelistedUsers.map((user) => (
                                <tr key={user.user_id}>
                                    <td>{user.user_id}</td>
                                    <td>{user.user_first_name || 'N/A'}</td>
                                    <td>{user.user_last_name || 'N/A'}</td>
                                    <td>{user.email}</td>
                                    <td>{user.mobile_phone_number || 'N/A'}</td>
                                    <td>
                                        <Form.Select
                                            value={user.role}
                                            onChange={(e) => handleRoleChangeRequest(user.user_id, user.role, e.target.value)}
                                            disabled={submitting || !canAssignRole} // Role dropdown is always enabled if current user is Admin
                                            title={!canAssignRole ? "Only Admin can assign roles" : ""}
                                        >
                                            <option value="USER">USER</option>
                                            <option value="MANAGER">MANAGER</option>
                                            <option value="ADMIN">ADMIN</option>
                                        </Form.Select>
                                    </td>
                                    <td>{new Date(user.added_at).toLocaleString()}</td>
                                    <td>
                                        <Button 
                                            variant="danger" 
                                            size="sm" 
                                            onClick={() => handleRemoveUser(user.user_id, user.role)} 
                                            disabled={submitting || !canRemove || user.role === 'ADMIN' || user.role === 'MANAGER'}
                                            title={user.role === 'ADMIN' || user.role === 'MANAGER' ? "Admin or Manager cannot be removed from whitelisted users." : ""}
                                        >
                                            {submitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : <><PersonDashFill className="me-2" />Remove</>}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <Alert variant="info">No users currently whitelisted.</Alert>
                )}
            </Card.Body>
            <ConfirmationModal
                show={showConfirmModal}
                title={confirmModalTitle}
                message={confirmModalMessage}
                onConfirm={confirmModalAction}
                onCancel={() => setShowConfirmModal(false)}
            />
        </Card>
    );
};

export default WhitelistedUserRoleManagement;