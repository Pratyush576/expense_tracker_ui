import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, ListGroup, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';
import { PersonFill, GraphUp, FileEarmarkTextFill, ClockFill } from 'react-bootstrap-icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const AdminDashboardHome = () => {
    const [totalUsers, setTotalUsers] = useState(0);
    const [activeSubscriptions, setActiveSubscriptions] = useState(0);
    const [pendingProposals, setPendingProposals] = useState(0);
    const [recentActivities, setRecentActivities] = useState([]);
    const [userSignups, setUserSignups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const [
                    usersCountRes,
                    subscriptionsRes,
                    proposalsRes,
                    activitiesRes,
                    userSignupsRes
                ] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/admin/users/count`, { headers }),
                    axios.get(`${API_BASE_URL}/api/admin/subscriptions/count`, { headers }),
                    axios.get(`${API_BASE_URL}/api/admin/proposals/count`, { headers }),
                    axios.get(`${API_BASE_URL}/api/admin/activity/recent?limit=10`, { headers }),
                    axios.get(`${API_BASE_URL}/api/admin/user-signups-by-day`, { headers })
                ]);

                setTotalUsers(usersCountRes.data.count);
                setActiveSubscriptions(subscriptionsRes.data.count);
                setPendingProposals(proposalsRes.data.count);
                setRecentActivities(activitiesRes.data);
                setUserSignups(userSignupsRes.data);

            } catch (err) {
                console.error("Error fetching admin dashboard data:", err);
                setError("Failed to fetch dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    console.log('userSignups:', userSignups);

    return (
        <div className="admin-dashboard-home">
            <h3 className="mb-4">Admin Dashboard Overview</h3>

            <Row className="mb-4">
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <PersonFill size={30} className="text-primary me-3" />
                                <div>
                                    <Card.Title className="mb-0">Total Users</Card.Title>
                                    <Card.Text className="fs-3 fw-bold">{totalUsers}</Card.Text>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <GraphUp size={30} className="text-success me-3" />
                                <div>
                                    <Card.Title className="mb-0">Active Subscriptions</Card.Title>
                                    <Card.Text className="fs-3 fw-bold">{activeSubscriptions}</Card.Text>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <FileEarmarkTextFill size={30} className="text-warning me-3" />
                                <div>
                                    <Card.Title className="mb-0">Pending Proposals</Card.Title>
                                    <Card.Text className="fs-3 fw-bold">{pendingProposals}</Card.Text>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col md={12}>
                    <Card className="shadow-sm mb-4">
                        <Card.Header className="bg-light">
                            User Sign-ups (Last 7 Days)
                        </Card.Header>
                        <Card.Body>
                            <BarChart width={500} height={300} data={userSignups}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#8884d8" name="Sign-ups" />
                            </BarChart>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm mb-4">
                <Card.Header className="bg-light">
                    <ClockFill className="me-2" />Recent Activities
                </Card.Header>
                <ListGroup variant="flush">
                    {recentActivities.length > 0 ? (
                        recentActivities.map((activity, index) => (
                            <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                                <div>
                                    <Badge bg="info" className="me-2">{activity.activity_type}</Badge>
                                    <small className="text-muted">User {activity.user_id} {activity.profile_id ? `(Profile: ${activity.profile_id})` : ''} from {activity.ip_address}</small>
                                </div>
                                <small className="text-muted">{new Date(activity.timestamp).toLocaleString()}</small>
                            </ListGroup.Item>
                        ))
                    ) : (
                        <ListGroup.Item>No recent activities.</ListGroup.Item>
                    )}
                </ListGroup>
            </Card>
        </div>
    );
};

export default AdminDashboardHome;
