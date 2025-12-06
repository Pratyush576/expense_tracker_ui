import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Card, Row, Col, Table, Alert } from 'react-bootstrap';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';
import { ChevronDown, ChevronUp, PlusCircle, DashCircle, Files } from 'react-bootstrap-icons';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const RecordAsset = ({ profileId, assetTypes, onAssetAdded }) => {
    const [assetRecords, setAssetRecords] = useState([
        { id: uuidv4(), date: new Date(), asset_type_id: '', asset_subtype_name: '', value: '', note: '' }
    ]);
    const [existingAssets, setExistingAssets] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const fetchExistingAssets = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/profiles/${profileId}/assets`);
            const sortedAssets = response.data.sort((a, b) => {
                const dateA = new Date(a.date.split('/')[1], a.date.split('/')[0] - 1);
                const dateB = new Date(b.date.split('/')[1], b.date.split('/')[0] - 1);
                return dateB - dateA;
            });
            setExistingAssets(sortedAssets);
            const initialCollapsedState = {};
            sortedAssets.forEach(asset => {
                initialCollapsedState[asset.asset_type_name] = true;
                initialCollapsedState[`${asset.asset_type_name}-${asset.asset_subtype_name || 'N/A'}`] = true;
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

    const handleInputChange = (id, event) => {
        const { name, value } = event.target;
        const newRecords = assetRecords.map(record => {
            if (record.id === id) {
                const newRecord = { ...record, [name]: value };
                if (name === 'asset_type_id') {
                    newRecord.asset_subtype_name = '';
                }
                return newRecord;
            }
            return record;
        });
        setAssetRecords(newRecords);
    };

    const handleDateChange = (id, date) => {
        const newRecords = assetRecords.map(record =>
            record.id === id ? { ...record, date } : record
        );
        setAssetRecords(newRecords);
    };

    const addRecord = () => {
        setAssetRecords([...assetRecords, { id: uuidv4(), date: new Date(), asset_type_id: '', asset_subtype_name: '', value: '', note: '' }]);
    };

    const removeRecord = (id) => {
        if (assetRecords.length > 1) {
            setAssetRecords(assetRecords.filter(record => record.id !== id));
        }
    };

    const copyRecord = (id) => {
        const recordToCopy = assetRecords.find(record => record.id === id);
        if (recordToCopy) {
            const newRecord = { ...recordToCopy, id: uuidv4() };
            const index = assetRecords.findIndex(record => record.id === id);
            const newRecords = [...assetRecords];
            newRecords.splice(index + 1, 0, newRecord);
            setAssetRecords(newRecords);
        }
    };

    const handleRecordAssets = async () => {
        setError('');
        setSuccess('');

        const assetsToProcess = assetRecords.map(record => {
            if (!record.asset_type_id || !record.value || !record.date) {
                throw new Error('Please fill in all required fields (Date, Asset Type, Value) for each record.');
            }
            const assetType = assetTypes.find(at => at.id === record.asset_type_id);
            if (!assetType) {
                throw new Error(`Invalid Asset Type selected for one of the records.`);
            }
            return {
                profile_id: profileId,
                date: format(record.date, 'MM/yyyy'),
                asset_type_id: record.asset_type_id,
                asset_type_name: assetType.name,
                asset_subtype_name: record.asset_subtype_name || null,
                value: parseFloat(record.value),
                note: record.note || null,
            };
        });

        try {
            await axios.post(`${API_BASE_URL}/api/assets`, { assets: assetsToProcess });
            setSuccess(`Successfully recorded ${assetsToProcess.length} asset(s).`);
            setAssetRecords([{ id: uuidv4(), date: new Date(), asset_type_id: '', asset_subtype_name: '', value: '', note: '' }]);
            fetchExistingAssets();
            if (onAssetAdded) {
                onAssetAdded();
            }
        } catch (err) {
            console.error('Error recording assets:', err);
            setError(err.message || 'Failed to record assets.');
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
        const assetDate = parse(asset.date, 'MM/yyyy', new Date());
        const newRecord = {
            id: uuidv4(),
            date: assetDate,
            asset_type_id: asset.asset_type_id,
            asset_subtype_name: asset.asset_subtype_name || '',
            value: asset.value.toString(),
            note: asset.note || ''
        };
        setAssetRecords([newRecord]);
    };

    const getAvailableSubtypes = (assetTypeId) => {
        const assetType = assetTypes.find(at => at.id === assetTypeId);
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
                    {assetRecords.map((record, index) => (
                        <Row key={record.id} className="mb-3 p-3 border rounded">
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Date</Form.Label>
                                    <DatePicker
                                        selected={record.date}
                                        onChange={(date) => handleDateChange(record.id, date)}
                                        dateFormat="MM/yyyy"
                                        showMonthYearPicker
                                        className="form-control"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Asset Type</Form.Label>
                                    <Form.Control as="select" name="asset_type_id" value={record.asset_type_id} onChange={(e) => handleInputChange(record.id, e)}>
                                        <option value="">Select Type</option>
                                        {assetTypes.map(at => (
                                            <option key={at.id} value={at.id}>{at.name}</option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Subtype</Form.Label>
                                    <Form.Control as="select" name="asset_subtype_name" value={record.asset_subtype_name} onChange={(e) => handleInputChange(record.id, e)} disabled={!record.asset_type_id || getAvailableSubtypes(record.asset_type_id).length === 0}>
                                        <option value="">Select Subtype</option>
                                        {getAvailableSubtypes(record.asset_type_id).map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Value</Form.Label>
                                    <Form.Control type="number" name="value" placeholder="Value" value={record.value} onChange={(e) => handleInputChange(record.id, e)} />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Note</Form.Label>
                                    <Form.Control type="text" name="note" placeholder="Note" value={record.note} onChange={(e) => handleInputChange(record.id, e)} />
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Button variant="info" size="sm" onClick={() => copyRecord(record.id)} className="me-2"><Files /></Button>
                                {assetRecords.length > 1 && <Button variant="danger" size="sm" onClick={() => removeRecord(record.id)}><DashCircle /></Button>}
                            </Col>
                        </Row>
                    ))}
                    <Row>
                        <Col>
                            <Button variant="secondary" onClick={addRecord}><PlusCircle /> Add Another Record</Button>
                        </Col>
                    </Row>
                    <hr />
                    <Row>
                        <Col>
                            <Button variant="primary" onClick={handleRecordAssets} className="w-100">Record Assets</Button>
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
                        {Object.entries(
                            existingAssets.reduce((acc, asset) => {
                                const assetType = asset.asset_type_name;
                                const assetSubtype = asset.asset_subtype_name || 'N/A';
                                if (!acc[assetType]) acc[assetType] = {};
                                if (!acc[assetType][assetSubtype]) acc[assetType][assetSubtype] = [];
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
