import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Card, Row, Col, ListGroup, Modal, InputGroup, Collapse } from 'react-bootstrap';
import { ChevronDown, ChevronUp, PencilSquare, Trash } from 'react-bootstrap-icons';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const AssetTypeManager = ({ profileId }) => {
    const [assetTypes, setAssetTypes] = useState([]);
    const [newAssetTypeName, setNewAssetTypeName] = useState('');
    const [newSubtypeInputs, setNewSubtypeInputs] = useState({}); // State for new subtype inputs per asset type
    const [openSubtypes, setOpenSubtypes] = useState({}); // State for collapsible subtypes

    // Modal states for editing asset type name and its subtypes
    const [showEditAssetTypeModal, setShowEditAssetTypeModal] = useState(false);
    const [currentAssetTypeEdit, setCurrentAssetTypeEdit] = useState({ id: null, name: '', subtypes: '' }); // subtypes as a comma-separated string

    const fetchAssetTypes = useCallback(async () => {
        try {
            console.log(`Fetching asset types for profileId: ${profileId}`);
            const response = await axios.get(`${API_BASE_URL}/api/profiles/${profileId}/asset_types`);
            console.log('API response for asset types:', response.data);
            const parsedAssetTypes = response.data.map(at => ({
                ...at,
                subtypes: at.subtypes
            }));
            console.log('parsedAssetTypes: ', parsedAssetTypes)
            setAssetTypes(parsedAssetTypes);
            console.log('Parsed asset types state:', parsedAssetTypes);
            // Initialize all subtypes to be collapsed by default
            const initialCollapseState = {};
            parsedAssetTypes.forEach((_, index) => {
                initialCollapseState[index] = false;
            });
            setOpenSubtypes(initialCollapseState);
        } catch (error) {
            console.error('Error fetching asset types:', error);
        }
    }, [profileId]);

    useEffect(() => {
        fetchAssetTypes();
    }, [profileId, fetchAssetTypes]);

    const handleAddAssetType = async () => {
        if (newAssetTypeName && !assetTypes.find(at => at.name === newAssetTypeName)) {
            const assetTypeData = {
                profile_id: profileId,
                name: newAssetTypeName,
                subtypes: [], // New asset type starts with no subtypes
            };
            try {
                await axios.post(`${API_BASE_URL}/api/asset_types`, assetTypeData);
                fetchAssetTypes();
                setNewAssetTypeName('');
            } catch (error) {
                console.error('Error adding asset type:', error);
            }
        }
    };

    const handleUpdateAssetType = async (assetTypeId, newName, newSubtypesArray) => {
        const assetTypeData = {
            name: newName,
            subtypes: newSubtypesArray,
        };
        try {
            await axios.put(`${API_BASE_URL}/api/asset_types/${assetTypeId}`, assetTypeData);
            fetchAssetTypes();
        } catch (error) {
            console.error('Error updating asset type:', error);
        }
    };

    const handleDeleteAssetType = async (assetTypeId, assetTypeName) => {
        if (window.confirm(`Are you sure you want to delete the asset type "${assetTypeName}"? This action cannot be undone.`)) {
            try {
                await axios.delete(`${API_BASE_URL}/api/asset_types/${assetTypeId}`);
                fetchAssetTypes();
            } catch (error) {
                console.error('Error deleting asset type:', error);
            }
        }
    };

    const handleAddSubtype = async (assetTypeIndex) => {
        const subtypeName = newSubtypeInputs[assetTypeIndex];
        const currentAssetType = assetTypes[assetTypeIndex];

        if (subtypeName && !currentAssetType.subtypes.includes(subtypeName)) {
            const updatedSubtypes = [...currentAssetType.subtypes, subtypeName];
            await handleUpdateAssetType(currentAssetType.id, currentAssetType.name, updatedSubtypes);
            setNewSubtypeInputs(prev => ({ ...prev, [assetTypeIndex]: '' })); // Clear input for this asset type
        }
    };

    const handleDeleteSubtype = async (assetTypeIndex, subtypeToDelete) => {
        const currentAssetType = assetTypes[assetTypeIndex];
        const updatedSubtypes = currentAssetType.subtypes.filter(st => st !== subtypeToDelete);
        await handleUpdateAssetType(currentAssetType.id, currentAssetType.name, updatedSubtypes);
    };

    const toggleSubtypes = (index) => {
        setOpenSubtypes(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleEditAssetTypeClick = (assetType) => {
        setCurrentAssetTypeEdit({
            id: assetType.id,
            name: assetType.name,
            subtypes: assetType.subtypes.join(', ') // Convert array to comma-separated string for editing
        });
        setShowEditAssetTypeModal(true);
    };

    const handleSaveEditAssetTypeModal = async () => {
        const updatedSubtypesArray = currentAssetTypeEdit.subtypes
            .split(',')
            .map(s => s.trim())
            .filter(s => s);
        await handleUpdateAssetType(currentAssetTypeEdit.id, currentAssetTypeEdit.name, updatedSubtypesArray);
        setShowEditAssetTypeModal(false);
    };

    return (
        <div>
            <Card className="mb-4">
                <Card.Header className="bg-primary text-white">Manage Asset Types and Subtypes</Card.Header>
                <Card.Body>
                    {assetTypes.map((assetType, index) => (
                        <Card key={assetType.id} className="mb-3 border-info">
                            <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center" onClick={() => toggleSubtypes(index)} style={{ cursor: 'pointer' }}>
                                <strong>{assetType.name}</strong>
                                <div>
                                    {openSubtypes[index] ? <ChevronUp /> : <ChevronDown />}
                                    <Button variant="light" size="sm" className="ms-2" onClick={(e) => { e.stopPropagation(); handleEditAssetTypeClick(assetType); }}><PencilSquare /></Button>{' '}
                                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteAssetType(assetType.id, assetType.name); }}><Trash /></Button>
                                </div>
                            </Card.Header>
                            <Collapse in={openSubtypes[index]}>
                                <div id={`subtypes-${assetType.id}`}>
                                    <Card.Body>
                                        <ListGroup>
                                            {assetType.subtypes.map((subtype, subIndex) => (
                                                <ListGroup.Item key={subIndex} className="d-flex justify-content-between align-items-center">
                                                    {subtype}
                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteSubtype(index, subtype)}>Delete</Button>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                        <InputGroup className="mt-3">
                                            <Form.Control
                                                type="text"
                                                value={newSubtypeInputs[index] || ''}
                                                onChange={(e) => setNewSubtypeInputs(prev => ({ ...prev, [index]: e.target.value }))}
                                                placeholder="New subtype name"
                                            />
                                            <Button variant="success" onClick={() => handleAddSubtype(index)}>Add Subtype</Button>
                                        </InputGroup>
                                    </Card.Body>
                                </div>
                            </Collapse>
                        </Card>
                    ))}
                    <InputGroup className="mt-3">
                        <Form.Control
                            type="text"
                            value={newAssetTypeName}
                            onChange={(e) => setNewAssetTypeName(e.target.value)}
                            placeholder="New asset type name"
                        />
                        <Button variant="success" onClick={handleAddAssetType}>Add Asset Type</Button>
                    </InputGroup>
                </Card.Body>
            </Card>

            {/* Edit Asset Type Modal */}
            <Modal show={showEditAssetTypeModal} onHide={() => setShowEditAssetTypeModal(false)}>
                <Modal.Header closeButton className="bg-info text-white">
                    <Modal.Title>Edit Asset Type</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Asset Type Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={currentAssetTypeEdit.name}
                            onChange={(e) => setCurrentAssetTypeEdit({ ...currentAssetTypeEdit, name: e.target.value })}
                        />
                    </Form.Group>
                    <Form.Group className="mt-3">
                        <Form.Label>Subtypes (comma-separated)</Form.Label>
                        <Form.Control
                            type="text"
                            value={currentAssetTypeEdit.subtypes}
                            onChange={(e) => setCurrentAssetTypeEdit({ ...currentAssetTypeEdit, subtypes: e.target.value })}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditAssetTypeModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSaveEditAssetTypeModal}>
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AssetTypeManager;
