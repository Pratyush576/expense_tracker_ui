import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';
import Chart from 'chart.js/auto';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const LogDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [groupBy, setGroupBy] = useState('day');
    const [selectedProfileId, setSelectedProfileId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedActivityType, setSelectedActivityType] = useState('');
    const [allProfiles, setAllProfiles] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allActivityTypes, setAllActivityTypes] = useState([]);
    const chartInstances = useRef([]); // Use useRef to store an array of chart instances

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const token = localStorage.getItem('token');
                const [profilesRes, usersRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/profiles`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setAllProfiles(profilesRes.data);
                setAllUsers(usersRes.data);

                const recentLogsRes = await axios.get(`${API_BASE_URL}/api/admin/activity/recent?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
                const uniqueActivityTypes = [...new Set(recentLogsRes.data.map(log => log.activity_type))];
                setAllActivityTypes(uniqueActivityTypes);

            } catch (error) {
                console.error('Error fetching filter options:', error);
            }
        };
        fetchFilterOptions();
    }, []);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = {
                start_date: startDate ? startDate.toISOString() : null,
                end_date: endDate ? endDate.toISOString() : null,
                group_by: groupBy,
                profile_id: selectedProfileId || null,
                user_id: selectedUserId || null,
                activity_type: selectedActivityType || null,
            };
            const response = await axios.get(`${API_BASE_URL}/api/admin/activity/logs`, {
                params,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setLogs(response.data);
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [startDate, endDate, groupBy, selectedProfileId, selectedUserId, selectedActivityType]);

    // Chart.js logic for multiple charts
    useEffect(() => {
        // Destroy all existing charts
        chartInstances.current.forEach(chart => chart.destroy());
        chartInstances.current = [];

        if (logs.length > 0 && allActivityTypes.length > 0) {
            const labels = logs.map(log => log.time_period);

            allActivityTypes.forEach(type => {
                const chartId = `chart-${type}`;
                const ctx = document.getElementById(chartId);

                if (ctx) {
                    const data = logs.map(log => log[type] || 0);
                    const color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`;

                    const newChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels,
                            datasets: [{
                                label: type,
                                data,
                                borderColor: color,
                                backgroundColor: color.replace('1)', '0.2)'), // Light fill
                                fill: false,
                                tension: 0.1,
                            }],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                },
                            },
                        },
                    });
                    chartInstances.current.push(newChart);
                }
            });
        }
    }, [logs, allActivityTypes]);

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">Activity Log Dashboard</Card.Header>
            <Card.Body>
                <Form>
                    <Row className="mb-3">
                        <Col md={3}>
                            <Form.Group controlId="startDate">
                                <Form.Label>Start Date</Form.Label>
                                <DatePicker selected={startDate} onChange={date => setStartDate(date)} className="form-control" />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group controlId="endDate">
                                <Form.Label>End Date</Form.Label>
                                <DatePicker selected={endDate} onChange={date => setEndDate(date)} className="form-control" />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group controlId="groupBy">
                                <Form.Label>Group By</Form.Label>
                                <Form.Control as="select" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                                    <option value="hour">Hour</option>
                                    <option value="day">Day</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                    <option value="quarter">Quarter</option>
                                    <option value="year">Year</option>
                                </Form.Control>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Button variant="primary" onClick={fetchLogs}>Apply Filters</Button>
                </Form>

                <h4 className="mt-4">Aggregated Logs</h4>
                <Row>
                    {allActivityTypes.map(type => (
                        <Col md={6} key={type} className="mb-4">
                            <Card className="h-100">
                                <Card.Header>{type} Activity Over Time</Card.Header>
                                <Card.Body>
                                    <div style={{ height: '300px' }}>
                                        <canvas id={`chart-${type}`}></canvas>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card.Body>
        </Card>
    );
};

export default LogDashboard;