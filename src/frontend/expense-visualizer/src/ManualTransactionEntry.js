import React, { useState, forwardRef } from 'react';
import { Form, Button, Card, Alert, Row, Col, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { PlusCircle, DashCircle, Files, JournalPlus, Download, Upload } from 'react-bootstrap-icons';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ActivityType = {
    TRANSACTION_BULK_UPLOAD_CLICKED: "TRANSACTION_BULK_UPLOAD_CLICKED",
};

// Custom Input for DatePicker to support floating labels
const CustomDatePickerInput = forwardRef(({ value, onClick, placeholder }, ref) => (
    <Form.Control
        type="text"
        onClick={onClick}
        value={value}
        ref={ref}
        placeholder={placeholder}
        readOnly
    />
));

const emptyTransaction = () => ({
    id: uuidv4(),
    date: new Date(),
    description: '',
    amount: '',
    payment_source: '',
    errors: {},
});

function ManualTransactionEntry({ profileId, paymentSources, onTransactionAdded }) {
    const [transactionRecords, setTransactionRecords] = useState([emptyTransaction()]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const logActivity = async (activityType, profileId = null) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/log_activity`, { activity_type: activityType, profile_id: profileId }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    };

    const handleInputChange = (id, e) => {
        const { name, value } = e.target;
        const newRecords = transactionRecords.map(record => {
            if (record.id === id) {
                const newRecord = { ...record, [name]: value };
                // Clear the error for this field when the user corrects it
                if (newRecord.errors) {
                    delete newRecord.errors[name];
                }
                return newRecord;
            }
            return record;
        });
        setTransactionRecords(newRecords);
    };

    const handleDateChange = (id, date) => {
        const newRecords = transactionRecords.map(record =>
            record.id === id ? { ...record, date } : record
        );
        setTransactionRecords(newRecords);
    };

    const addRecord = () => {
        setTransactionRecords([...transactionRecords, emptyTransaction()]);
    };

    const removeRecord = (id) => {
        if (transactionRecords.length > 1) {
            setTransactionRecords(transactionRecords.filter(record => record.id !== id));
        }
    };

    const copyRecord = (id) => {
        const recordToCopy = transactionRecords.find(record => record.id === id);
        if (recordToCopy) {
            const newRecord = { ...recordToCopy, id: uuidv4(), errors: {} }; // Clear errors on copy
            const index = transactionRecords.findIndex(record => record.id === id);
            const newRecords = [...transactionRecords];
            newRecords.splice(index + 1, 0, newRecord);
            setTransactionRecords(newRecords);
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const newRecords = results.data.map(csvRow => {
                    const errors = {};
                    
                    // Validate Payment Source
                    const paymentSourceValue = csvRow['Payment Source'] || '';
                    const isValidPaymentSource = paymentSources.includes(paymentSourceValue);
                    if (!isValidPaymentSource) {
                        errors.payment_source = true;
                    }

                    return {
                        id: uuidv4(),
                        date: csvRow.Date ? new Date(csvRow.Date) : new Date(),
                        description: csvRow.Description || '',
                        amount: csvRow.Amount || '',
                        payment_source: isValidPaymentSource ? paymentSourceValue : '',
                        errors: errors,
                    };
                });

                if (newRecords.length > 0) {
                    setTransactionRecords(newRecords);
                    logActivity(ActivityType.TRANSACTION_BULK_UPLOAD_CLICKED, profileId);
                }
            },
            error: (error) => {
                setError('Failed to parse CSV file: ' + error.message);
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            const transactionsToSubmit = transactionRecords.map(record => {
                if (!record.date || !record.description || !record.amount || !record.payment_source) {
                    throw new Error("Please fill in all required fields for each record.");
                }
                if (isNaN(parseFloat(record.amount))) {
                    throw new Error("Amount must be a valid number for each record.");
                }
                return {
                    date: record.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                    description: record.description,
                    amount: parseFloat(record.amount),
                    payment_source: record.payment_source,
                    profile_id: profileId
                };
            });

            await axios.post(`${API_BASE_URL}/api/transactions/bulk`, { transactions: transactionsToSubmit });
            setSuccess(`Successfully added ${transactionsToSubmit.length} transaction(s)!`);
            setTransactionRecords([emptyTransaction()]);
            if (onTransactionAdded) {
                onTransactionAdded();
            }
        } catch (err) {
            console.error("Error adding transactions:", err);
            setError(err.message || err.response?.data?.detail || "Failed to add transactions.");
        }
    };

    return (
        <Card className="mb-4">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                <JournalPlus className="me-2" />Manual Transaction Entry
                <div className="d-flex align-items-center">
                    <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip id="download-template-tooltip">Download CSV template for bulk upload</Tooltip>}
                    >
                        <a href="/transaction_template.csv" download="transaction_template.csv" className="me-2">
                            <Button variant="light" size="sm"><Download className="me-1" />Download Template</Button>
                        </a>
                    </OverlayTrigger>
                    <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip id="upload-csv-tooltip">Upload transactions from a CSV file</Tooltip>}
                    >
                        <Form.Group controlId="formFileSm" className="mb-0 d-flex align-items-center">
                            <Form.Label className="mb-0 me-2 btn btn-light btn-sm">
                                <Upload className="me-1" />Upload CSV
                            </Form.Label>
                            <Form.Control type="file" size="sm" accept=".csv" onChange={handleFileUpload} className="d-none" />
                        </Form.Group>
                    </OverlayTrigger>
                </div>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                {paymentSources.length === 0 && (
                    <Alert variant="warning" className="text-center mb-4">
                        No payment sources found for this profile. Please add payment sources in the "Settings" tab before adding transactions.
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    {transactionRecords.map((record, index) => (
                        <Row key={record.id} className="mb-3 p-3 border rounded align-items-end g-3">
                            <Col md={2}>
                                <Form.Group className="form-floating" controlId={`floatingDate-${record.id}`}>
                                    <DatePicker
                                        selected={record.date}
                                        onChange={(date) => handleDateChange(record.id, date)}
                                        dateFormat="MM/dd/yyyy"
                                        className="form-control"
                                        customInput={<CustomDatePickerInput placeholder="Date" />}
                                        required
                                    />
                                    <Form.Label>Date</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="form-floating" controlId={`floatingDescription-${record.id}`}>
                                    <Form.Control
                                        type="text"
                                        name="description"
                                        value={record.description}
                                        onChange={(e) => handleInputChange(record.id, e)}
                                        placeholder="Enter description"
                                        required
                                    />
                                    <Form.Label>Description</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group className="form-floating" controlId={`floatingAmount-${record.id}`}>
                                    <Form.Control
                                        type="number"
                                        name="amount"
                                        value={record.amount}
                                        onChange={(e) => handleInputChange(record.id, e)}
                                        placeholder="Amount"
                                        step="0.01"
                                        required
                                    />
                                    <Form.Label>Amount</Form.Label>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="form-floating" controlId={`floatingPaymentSource-${record.id}`}>
                                    <Form.Control 
                                        as="select" 
                                        name="payment_source" 
                                        value={record.payment_source} 
                                        onChange={(e) => handleInputChange(record.id, e)} 
                                        required
                                        isInvalid={!!record.errors?.payment_source}
                                        disabled={paymentSources.length === 0}
                                    >
                                        <option value="">Select...</option>
                                        {paymentSources.map((source, index) => (
                                            <option key={index} value={source}>{source}</option>
                                        ))}
                                    </Form.Control>
                                    <Form.Label>Payment Source</Form.Label>
                                    {record.errors?.payment_source && (
                                        <Form.Control.Feedback type="invalid">
                                            Invalid Payment Source. Please add it in Settings.
                                        </Form.Control.Feedback>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={1} className="d-flex">
                                <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip id={`copy-tooltip-${record.id}`}>Copy this transaction</Tooltip>}
                                >
                                    <Button variant="info" size="sm" onClick={() => copyRecord(record.id)} className="me-2"><Files /></Button>
                                </OverlayTrigger>
                                {transactionRecords.length > 1 && (
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip id={`remove-tooltip-${record.id}`}>Remove this transaction</Tooltip>}
                                    >
                                        <Button variant="danger" size="sm" onClick={() => removeRecord(record.id)}><DashCircle /></Button>
                                    </OverlayTrigger>
                                )}
                            </Col>
                        </Row>
                    ))}
                    
                    <Row className="mt-3">
                        <Col>
                            <Button variant="secondary" onClick={addRecord}><PlusCircle className="me-2" /> Add Another Transaction</Button>
                        </Col>
                    </Row>
                    <hr />
                    <Row>
                        <Col>
                            <Button variant="primary" type="submit" className="w-100">
                                Add {transactionRecords.length} Transaction(s)
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Card.Body>
        </Card>
    );
}

export default ManualTransactionEntry;
