import React, { useState, useEffect } from 'react';
import { Table, Alert, Badge } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import axios from 'axios';
import { ClipboardData } from 'react-bootstrap-icons'; // Import icon

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const MyProposals = () => {
    const [proposals, setProposals] = useState([]);
    const [error, setError] = useState('');

    const fetchProposals = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/manager/proposals`);
            setProposals(response.data);
        } catch (err) {
            setError('Failed to fetch proposals.');
            console.error('Error fetching proposals:', err);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <Badge bg="success">Approved</Badge>;
            case 'rejected':
                return <Badge bg="danger">Rejected</Badge>;
            case 'pending':
            default:
                return <Badge bg="warning">Pending</Badge>;
        }
    };

    return (
        <Card className="mb-4">
            <Card.Header className="bg-primary text-white d-flex align-items-center">
                <ClipboardData className="me-2" />
                <h5 className="mb-0">My Proposals</h5>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Table striped bordered hover responsive className="mt-3">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Payload</th>
                            <th>Rejection Reason</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {proposals.map(proposal => (
                            <tr key={proposal.id}>
                                <td>{proposal.id}</td>
                                <td>{proposal.proposal_type}</td>
                                <td>{getStatusBadge(proposal.status)}</td>
                                <td><pre>{JSON.stringify(proposal.payload, null, 2)}</pre></td>
                                <td>{proposal.rejection_reason || 'N/A'}</td>
                                <td>{new Date(proposal.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default MyProposals;
