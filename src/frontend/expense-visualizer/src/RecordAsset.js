import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Card, Row, Col, Table, Alert } from 'react-bootstrap';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const RecordAsset = ({ profileId, assetTypes, onAssetAdded }) => {
    const [selectedAssetType, setSelectedAssetType] = useState('');
    const [selectedSubtype, setSelectedSubtype] = useState('');
    const [assetValue, setAssetValue] = useState('');
    const [assetNote, setAssetNote] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [existingAssets, setExistingAssets] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingAssetId, setEditingAssetId] = useState(null); // New state for editing asset ID

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

        if (!selectedAssetType || !assetValue || !selectedDate) {
            setError('Please fill in all required fields (Asset Type, Value, Date).');
            return;
        }

        const assetType = assetTypes.find(at => at.id === selectedAssetType);
        if (!assetType) {
            setError('Selected Asset Type not found.');
            return;
        }

        const formattedDate = format(selectedDate, 'MM/yyyy'); // Assuming MM/YYYY format for backend

        const assetData = {
            profile_id: profileId,
            date: formattedDate,
            asset_type_id: selectedAssetType,
            asset_type_name: assetType.name,
            asset_subtype_name: selectedSubtype || null,
            value: parseFloat(assetValue),
            note: assetNote || null, // Include the optional note
        };

        try {
            if (editingAssetId) {
                // Update existing asset
                await axios.put(`${API_BASE_URL}/api/assets/${editingAssetId}`, assetData);
                setSuccess('Asset updated successfully!');
            } else {
                // Create new asset
                await axios.post(`${API_BASE_URL}/api/assets`, assetData);
                setSuccess('Asset added successfully!');
            }
            
            fetchExistingAssets(); // Refresh the list of assets
            if (onAssetAdded) {
                onAssetAdded(); // Notify parent component to re-fetch data
            }
            // Clear form fields
            setSelectedAssetType('');
            setSelectedSubtype('');
            setAssetValue('');
            setAssetNote(''); // Clear the note field
            setSelectedDate(new Date());
            setEditingAssetId(null); // Exit edit mode

        } catch (err) {
            console.error('Error adding/updating asset:', err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Failed to add/update asset.');
            }
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
        // Parse the "MM/yyyy" string into a Date object
        setSelectedDate(parse(asset.date, 'MM/yyyy', new Date()));
        setAssetNote(asset.note || '');
        setEditingAssetId(asset.id);
    };

    const handleCancelEdit = () => {
        setSelectedAssetType('');
        setSelectedSubtype('');
        setAssetValue('');
        setAssetNote('');
        setSelectedDate(new Date());
        setEditingAssetId(null);
        setError('');
        setSuccess('');
    };

    const getAvailableSubtypes = () => {
        const assetType = assetTypes.find(at => at.id === selectedAssetType);
        return assetType ? assetType.subtypes : [];
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
                            <Form.Group controlId="formAssetDate">
                                <Form.Label>Date</Form.Label>
                                <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
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
                                const typeName = asset.asset_type_name;
                                if (!acc[typeName]) {
                                    acc[typeName] = [];
                                }
                                acc[typeName].push(asset);
                                return acc;
                            }, {})
                        ).map(([typeName, assetsOfType]) => (
                            <React.Fragment key={typeName}>
                                <tr className="table-primary">
                                    <td colSpan="6"><strong>{typeName}</strong></td>
                                </tr>
                                {assetsOfType.map(asset => (
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
                    </tbody>
                </Table>
            </Card.Footer>
        </Card>
    );
};

export default RecordAsset;