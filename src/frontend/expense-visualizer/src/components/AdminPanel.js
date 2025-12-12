import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Nav, Container, Row, Col, Button } from 'react-bootstrap';
import { PeopleFill, CashStack, TagFill, ClipboardCheck, ClipboardData, FileEarmarkPlus, ArrowLeft, HouseFill } from 'react-bootstrap-icons'; // Import icons
import UserManagement from './admin/UserManagement';
import PriceManagement from './admin/PriceManagement';
import DiscountManagement from './admin/DiscountManagement';
import ProposalForm from './admin/ProposalForm';
import MyProposals from './admin/MyProposals';
import ProposalQueue from './admin/ProposalQueue';
import AdminDashboardHome from './admin/AdminDashboardHome';
import LogDashboard from './admin/LogDashboard'; // Import LogDashboard
import authService from '../utils/authService';

const AdminPanel = ({ currentUser }) => {
    const navigate = useNavigate();
    const isAdmin = currentUser?.role === 'ADMIN';
    const isManager = currentUser?.role === 'MANAGER';

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const adminRoutes = [
        isAdmin && <Route key="users" path="users" element={<UserManagement />} />,
        isAdmin && <Route key="pricing" path="pricing" element={<PriceManagement />} />,
        isAdmin && <Route key="discounts" path="discounts" element={<DiscountManagement />} />,
        isAdmin && <Route key="proposals" path="proposals" element={<ProposalQueue />} />,
        isAdmin && <Route key="logs" path="logs" element={<LogDashboard />} />,
        (isAdmin || isManager) && <Route key="my-proposals" path="my-proposals" element={<MyProposals />} />,
        (isAdmin || isManager) && <Route key="new-proposal" path="new-proposal" element={<ProposalForm />} />,
        <Route key="index" index element={<AdminDashboardHome />} />
    ].filter(Boolean); // Filter out false/null values

    return (
        <Container fluid className="mt-4">
            <Row>
                <Col md={3} lg={2} className="bg-light sidebar">
                    <Nav className="flex-column">
                        <Nav.Link as={Link} to="" className="d-flex align-items-center"><HouseFill className="me-2" />Admin Home</Nav.Link>
                        {isAdmin && <Nav.Link as={Link} to="users" className="d-flex align-items-center"><PeopleFill className="me-2" />User Management</Nav.Link>}
                        {isAdmin && <Nav.Link as={Link} to="pricing" className="d-flex align-items-center"><CashStack className="me-2" />Pricing</Nav.Link>}
                        {isAdmin && <Nav.Link as={Link} to="discounts" className="d-flex align-items-center"><TagFill className="me-2" />Discounts</Nav.Link>}
                        {isAdmin && <Nav.Link as={Link} to="proposals" className="d-flex align-items-center"><ClipboardCheck className="me-2" />Proposals</Nav.Link>}
                        {isAdmin && <Nav.Link as={Link} to="logs" className="d-flex align-items-center"><ClipboardData className="me-2" />Activity Logs</Nav.Link>}
                        
                        {(isAdmin || isManager) && <Nav.Link as={Link} to="my-proposals" className="d-flex align-items-center"><ClipboardData className="me-2" />My Proposals</Nav.Link>}
                        {(isAdmin || isManager) && <Nav.Link as={Link} to="new-proposal" className="d-flex align-items-center"><FileEarmarkPlus className="me-2" />New Proposal</Nav.Link>}
                    </Nav>
                </Col>
                <Col md={9} lg={10}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="mb-0">Admin Panel</h2>
                        <div>
                            <Link to="/">
                                <Button variant="secondary" className="me-2 d-flex align-items-center">
                                    <ArrowLeft className="me-2" />Back to User Page
                                </Button>
                            </Link>
                            <Button variant="outline-danger" onClick={handleLogout}>Logout</Button>
                        </div>
                    </div>
                    <Routes>
                        {adminRoutes}
                    </Routes>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminPanel;
