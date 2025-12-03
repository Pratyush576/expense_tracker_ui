import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Card, Row, Col, Table, Alert } from 'react-bootstrap';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';
import { ChevronDown, ChevronUp } from 'react-bootstrap-icons'; // Import icons
import { formatCurrency } from './utils/currency';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const RecordAsset = ({ profileId, assetTypes, onAssetAdded }) => {
    const [selectedAssetType, setSelectedAssetType] = useState('');
    const [selectedSubtype, setSelectedSubtype] = useState('');
    const [assetValue, setAssetValue] = useState('');
    const [assetNote, setAssetNote] = useState('');
    const [selectedStartDate, setSelectedStartDate] = useState(new Date()); // New state for start date
    const [selectedEndDate, setSelectedEndDate] = useState(new Date());   // New state for end date
    const [existingAssets, setExistingAssets] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingAssetId, setEditingAssetId] = useState(null); // New state for editing asset ID
    const [originalAssetDate, setOriginalAssetDate] = useState(null); // New state to store original asset date for edit mode
    const [collapsedGroups, setCollapsedGroups] = useState({}); // State to manage collapsed groups

    // Helper to get months in range (MM/yyyy)
    const getMonthsInRange = (startDate, endDate) => {
        const dates = [];
        let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (currentDate <= endDate) {
            dates.push(format(currentDate, 'MM/yyyy'));
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        return dates;
    };

    const fetchExistingAssets = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/profiles/${profileId}/assets`);
            const sortedAssets = response.data.sort((a, b) => {
                // Parse "MM/yyyy" date strings into Date objects for comparison
                const dateA = new Date(a.date.split('/')[1], a.date.split('/')[0] - 1);
                const dateB = new Date(b.date.split('/')[1], b.date.split('/')[0] - 1);
                return dateB - dateA; // Sort in descending order (latest month at top)
            });
            setExistingAssets(sortedAssets);
            // Initialize all groups as collapsed by default
            const initialCollapsedState = {};
            sortedAssets.forEach(asset => {
                initialCollapsedState[asset.asset_type_name] = true; // Collapse asset type groups
                initialCollapsedState[`${asset.asset_type_name}-${asset.asset_subtype_name || 'N/A'}`] = true; // Collapse subtype groups
            });
            setCollapsedGroups(initialCollapsedState);
        } catch (error) {
            console.error('Error fetching existing assets:', error);
            setError('Failed to fetch existing assets.');
        }
    }, [profileId]);

    useEffect(() => {
        fetchExistingAssets();
    }, [profileId, fetchExistingAssets]);

    const handleAssetTypeChange = (e) => {
        setSelectedAssetType(e.target.value);
        setSelectedSubtype(''); // Reset subtype when asset type changes
    };

    const handleAddOrUpdateAsset = async () => {
        setError('');
        setSuccess('');

        if (!selectedAssetType || !assetValue || !selectedStartDate || !selectedEndDate) {
            setError('Please fill in all required fields (Asset Type, Value, Start Month, End Month).');
            return;
        }
        if (selectedStartDate > selectedEndDate) {
            setError('Start Month cannot be after End Month.');
            return;
        }

        const assetType = assetTypes.find(at => at.id === selectedAssetType);
        if (!assetType) {
            setError('Selected Asset Type not found.');
            return;
        }

        const formattedStartDate = format(selectedStartDate, 'MM/yyyy');

        let successMessages = [];
        let errorMessages = [];

        try {
            const monthsToAffect = getMonthsInRange(selectedStartDate, selectedEndDate);
            const assetsToProcess = [];
            let originalAssetDeleted = false;

            if (editingAssetId) {
                // If original asset's date is not in the new range, delete it
                if (originalAssetDate && !monthsToAffect.includes(originalAssetDate)) {
                    await axios.delete(`${API_BASE_URL}/api/assets/${editingAssetId}`);
                    successMessages.push(`Deleted original asset for ${originalAssetDate}.`);
                    originalAssetDeleted = true;
                }
            }

            for (const month of monthsToAffect) {
                const assetData = {
                    profile_id: profileId,
                    date: month,
                    asset_type_id: selectedAssetType,
                    asset_type_name: assetType.name,
                    asset_subtype_name: selectedSubtype || null,
                    value: parseFloat(assetValue),
                    note: assetNote || null,
                };
                assetsToProcess.push(assetData);
            }

            // Send bulk create/update request
            await axios.post(`${API_BASE_URL}/api/assets`, { assets: assetsToProcess });
            
            if (editingAssetId && !originalAssetDeleted) {
                successMessages.push(`Updated assets for ${monthsToAffect.length} months.`);
            } else if (editingAssetId && originalAssetDeleted) {
                successMessages.push(`Created/Updated assets for ${monthsToAffect.length} months.`);
            }
            else {
                successMessages.push(`Assets recorded successfully for ${monthsToAffect.length} months.`);
            }
            
            fetchExistingAssets(); // Refresh the list of assets
            if (onAssetAdded) {
                onAssetAdded(); // Notify parent component to re-fetch data
            }
            // Clear form fields
            setSelectedAssetType('');
            setSelectedSubtype('');
            setAssetValue('');
            setAssetNote('');
            setSelectedStartDate(new Date());
            setSelectedEndDate(new Date());
            setEditingAssetId(null); // Exit edit mode
            setOriginalAssetDate(null); // Clear original asset date

            setSuccess(successMessages.join('\n'));

        } catch (err) {
            console.error('Error adding/updating asset:', err);
            if (err.response && err.response.data && err.response.data.detail) {
                if (Array.isArray(err.response.data.detail)) {
                    const messages = err.response.data.detail.map(item => {
                        if (typeof item === 'string') {
                            return item;
                        } else if (item && typeof item === 'object' && item.msg) {
                            return item.msg;
                        } else if (item && typeof item === 'object' && item.detail) {
                            return item.detail;
                        }
                        return JSON.stringify(item);
                    });
                    errorMessages.push(messages.join('\n'));
                } else {
                    errorMessages.push(err.response.data.detail);
                }
            } else {
                errorMessages.push('Failed to add/update asset.');
            }
            setError(errorMessages.join('\n'));
        }
    };

    const handleDeleteAsset = async (assetId) => {
        if (window.confirm('Are you sure you want to delete this asset record?')) {
            try {
                await axios.delete(`${API_BASE_URL}/api/assets/${assetId}`);
                setSuccess('Asset deleted successfully!');
                fetchExistingAssets(); // Refresh the list of assets
                if (onAssetAdded) {
                    onAssetAdded(); // Notify parent component to re-fetch data
                }
            } catch (err) {
                console.error('Error deleting asset:', err);
                setError('Failed to delete asset.');
            }
        }
    };

    const handleEditAsset = (asset) => {
        setSelectedAssetType(asset.asset_type_id);
        setSelectedSubtype(asset.asset_subtype_name || '');
        setAssetValue(asset.value.toString());
        const assetDate = parse(asset.date, 'MM/yyyy', new Date());
        setSelectedStartDate(assetDate);
        setSelectedEndDate(assetDate);
        setAssetNote(asset.note || '');
        setEditingAssetId(asset.id);
        setOriginalAssetDate(asset.date); // Store original date
    };

    const handleCancelEdit = () => {
        setSelectedAssetType('');
        setSelectedSubtype('');
        setAssetValue('');
        setAssetNote('');
        setSelectedStartDate(new Date());
        setSelectedEndDate(new Date());
        setEditingAssetId(null);
        setOriginalAssetDate(null); // Clear original asset date
        setError('');
        setSuccess('');
    };

    const getAvailableSubtypes = () => {
        const assetType = assetTypes.find(at => at.id === selectedAssetType);
        return assetType ? assetType.subtypes : [];
    };

    const toggleGroup = (groupKey) => {
        setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    return (
        <Card className="mb-4">
            <Card.Header className="bg-primary text-white">Record Asset Value</Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                <Form>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group controlId="formAssetStartDate">
                                <Form.Label>Start Month/Year</Form.Label>
                                <DatePicker
                                    selected={selectedStartDate}
                                    onChange={(date) => setSelectedStartDate(date)}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                    className="form-control"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="formAssetEndDate">
                                <Form.Label>End Month/Year</Form.Label>
                                <DatePicker
                                    selected={selectedEndDate}
                                    onChange={(date) => setSelectedEndDate(date)}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                    className="form-control"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group controlId="formAssetType">
                                <Form.Label>Asset Type</Form.Label>
                                <Form.Control as="select" value={selectedAssetType} onChange={handleAssetTypeChange}>
                                    <option value="">Select Asset Type</option>
                                    {assetTypes.map(at => (
                                        <option key={at.id} value={at.id}>{at.name}</option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group controlId="formAssetSubtype">
                                <Form.Label>Subtype</Form.Label>
                                <Form.Control as="select" value={selectedSubtype} onChange={(e) => setSelectedSubtype(e.target.value)} disabled={!selectedAssetType || getAvailableSubtypes().length === 0}>
                                    <option value="">Select Subtype (Optional)</option>
                                    {getAvailableSubtypes().map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group controlId="formAssetValue">
                                <Form.Label>Value</Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="Enter asset value"
                                    value={assetValue}
                                    onChange={(e) => setAssetValue(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group controlId="formAssetNote">
                                <Form.Label>Note (Optional)</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Add a note"
                                    value={assetNote}
                                    onChange={(e) => setAssetNote(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={12} className="d-flex align-items-end">
                            <Button variant="primary" onClick={handleAddOrUpdateAsset} className="w-100">
                                {editingAssetId ? 'Update Asset' : 'Record Asset'}
                            </Button>
                            {editingAssetId && (
                                <Button variant="secondary" onClick={handleCancelEdit} className="w-100 ms-2">
                                    Cancel Edit
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Form>
            </Card.Body>
            <Card.Footer>
                <h5>Existing Asset Records</h5>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Asset Type</th>
                            <th>Subtype</th>
                            <th>Value</th>
                            <th>Note</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Group assets by asset_type_name */}
                        {Object.entries(
                            existingAssets.reduce((acc, asset) => {
                                const assetType = asset.asset_type_name;
                                const assetSubtype = asset.asset_subtype_name || 'N/A'; // Use 'N/A' for assets without a subtype

                                if (!acc[assetType]) {
                                    acc[assetType] = {};
                                }
                                if (!acc[assetType][assetSubtype]) {
                                    acc[assetType][assetSubtype] = [];
                                }
                                acc[assetType][assetSubtype].push(asset);
                                return acc;
                            }, {})
                        ).map(([assetType, subtypesMap]) => (
                            <React.Fragment key={assetType}>
                                <tr className="table-primary">
                                    <td colSpan="6" onClick={() => toggleGroup(assetType)} style={{ cursor: 'pointer' }}>
                                        <strong>Asset Type: {assetType}</strong>
                                        {collapsedGroups[assetType] ? <ChevronDown className="ms-2" /> : <ChevronUp className="ms-2" />}
                                    </td>
                                </tr>
                                {!collapsedGroups[assetType] && Object.entries(subtypesMap).map(([subtype, assetsInSubtype]) => (
                                    <React.Fragment key={subtype}>
                                        <tr className="table-secondary">
                                            <td colSpan="6" className="ps-4" onClick={() => toggleGroup(`${assetType}-${subtype}`)} style={{ cursor: 'pointer' }}>
                                                <strong>Subtype: {subtype}</strong>
                                                {collapsedGroups[`${assetType}-${subtype}`] ? <ChevronDown className="ms-2" /> : <ChevronUp className="ms-2" />}
                                            </td>
                                        </tr>
                                        {!collapsedGroups[`${assetType}-${subtype}`] && assetsInSubtype.map(asset => (
                                            <tr key={asset.id}>
                                                <td>{asset.date}</td>
                                                <td>{asset.asset_type_name}</td>
                                                <td>{asset.asset_subtype_name || 'N/A'}</td>
                                                <td>{asset.value}</td>
                                                <td>{asset.note || 'N/A'}</td>
                                                <td>
                                                    <Button variant="info" size="sm" className="me-2" onClick={() => handleEditAsset(asset)}>Edit</Button>
                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteAsset(asset.id)}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </Table>
            </Card.Footer>
        </Card>
    );
};

export default RecordAsset;