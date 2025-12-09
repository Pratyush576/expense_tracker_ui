import React, { useState, useEffect } from 'react';
import { Table, Alert, Badge, Button, Modal, Form } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ProposalQueue = () => {
    const [proposals, setProposals] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [currentProposal, setCurrentProposal] = useState(null);

    const fetchProposals = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/proposals`);
            setProposals(response.data);
        } catch (err) {
            setError('Failed to fetch proposals.');
            console.error('Error fetching proposals:', err);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    const handleApprove = async (proposalId) => {
        setError('');
        setSuccess('');
        try {
            await axios.post(`${API_BASE_URL}/api/admin/proposals/${proposalId}/approve`);
            setSuccess(`Proposal #${proposalId} approved successfully.`);
            fetchProposals(); // Refresh list
        } catch (err) {
            setError(`Failed to approve proposal #${proposalId}.`);
            console.error('Error approving proposal:', err);
        }
    };

    const openRejectModal = (proposal) => {
        setCurrentProposal(proposal);
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!currentProposal || !rejectionReason) {
            setError('Rejection reason cannot be empty.');
            return;
        }
        setError('');
        setSuccess('');
        try {
            await axios.post(`${API_BASE_URL}/api/admin/proposals/${currentProposal.id}/reject`, { reason: rejectionReason });
            setSuccess(`Proposal #${currentProposal.id} rejected successfully.`);
            setShowRejectModal(false);
            setRejectionReason('');
            setCurrentProposal(null);
            fetchProposals(); // Refresh list
        } catch (err) {
            setError(`Failed to reject proposal #${currentProposal.id}.`);
            console.error('Error rejecting proposal:', err);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <Badge bg="success">Approved</Badge>;
            case 'rejected': return <Badge bg="danger">Rejected</Badge>;
            case 'pending': default: return <Badge bg="warning">Pending</Badge>;
        }
    };

    return (
        <div>
            <h2>Proposals Review Queue</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Proposer ID</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Payload</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {proposals.filter(p => p.status === 'pending').map(proposal => (
                        <tr key={proposal.id}>
                            <td>{proposal.id}</td>
                            <td>{proposal.proposer_id}</td>
                            <td>{proposal.proposal_type}</td>
                            <td>{getStatusBadge(proposal.status)}</td>
                            <td><pre>{JSON.stringify(proposal.payload, null, 2)}</pre></td>
                            <td>{new Date(proposal.created_at).toLocaleString()}</td>
                            <td>
                                <Button variant="success" size="sm" className="me-2" onClick={() => handleApprove(proposal.id)}>Approve</Button>
                                <Button variant="danger" size="sm" onClick={() => openRejectModal(proposal)}>Reject</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Reject Proposal #{currentProposal?.id}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Reason for Rejection</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            value={rejectionReason} 
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReject}>Confirm Rejection</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ProposalQueue;
