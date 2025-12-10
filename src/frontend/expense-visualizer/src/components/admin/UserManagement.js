import React, { useState, useEffect } from 'react';
import { Table, Form, Alert, Card } from 'react-bootstrap';
import axios from 'axios';
import { PeopleFill } from 'react-bootstrap-icons'; // Import icon

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/users`);
            setUsers(response.data);
        } catch (err) {
            setError('Failed to fetch users.');
            console.error('Error fetching users:', err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        setError('');
        setSuccess('');
        try {
            await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/assign-role`, { role: newRole });
            setSuccess(`Successfully updated role for user ${userId}.`);
            // Update the user's role in the local state to reflect the change immediately
            setUsers(users.map(user => 
                user.id === userId ? { ...user, role: newRole } : user
            ));
        } catch (err) {
            setError(`Failed to update role for user ${userId}.`);
            console.error('Error updating role:', err);
        }
    };

    return (
        <Card className="mb-4">
            <Card.Header className="bg-primary text-white d-flex align-items-center">
                <PeopleFill className="me-2" />
                <h5 className="mb-0">User Management</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                <Table striped bordered hover responsive className="mt-3">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Email</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.email}</td>
                                <td>{user.user_first_name}</td>
                                <td>{user.user_last_name}</td>
                                <td>
                                    <Form.Select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    >
                                        <option value="USER">User</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Admin</option>
                                    </Form.Select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default UserManagement;
