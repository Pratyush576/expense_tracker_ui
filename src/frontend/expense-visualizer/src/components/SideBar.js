import React, { useState, useEffect } from 'react';
import { ListGroup, Button, Dropdown } from 'react-bootstrap'; // Import Tooltip, OverlayTrigger, and Dropdown
import { PlusCircle, PersonGear, Briefcase, GraphUp, Gear, Pencil, Key } from 'react-bootstrap-icons'; // Import icons
import CreateProfileModal from './CreateProfileModal';
import ManageProfilesModal from './ManageProfilesModal'; // Import ManageProfilesModal
import UserProfileEditModal from './UserProfileEditModal'; // New: Import UserProfileEditModal
import ChangePasswordModal from './ChangePasswordModal'; // New: Import ChangePasswordModal
import { getFlagEmoji } from '../utils/currency'; // Import getFlagEmoji
import axios from 'axios'; // Import axios

const API_BASE_URL = 'http://localhost:8000';

const ActivityType = {
    PROFILE_MANAGEMENT_MODAL_OPENED: "PROFILE_MANAGEMENT_MODAL_OPENED",
    PROFILE_MANAGEMENT_MODAL_CLOSED: "PROFILE_MANAGEMENT_MODAL_CLOSED",
};

const SideBar = ({ profiles, activeProfileId, setActiveProfileId, handleCreateProfile, handleUpdateProfile, handleDeleteProfile, onProfileVisibilityChange, showCreateProfileModalFromHome, setShowCreateProfileModalFromHome }) => {
    const [showCreateProfileModal, setShowCreateProfileModal] = useState(showCreateProfileModalFromHome);
    const [showManageProfilesModal, setShowManageProfilesModal] = useState(false); // New state for manage profiles modal
    const [showUserProfileEditModal, setShowUserProfileEditModal] = useState(false); // New state
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false); // New state

    useEffect(() => {
        setShowCreateProfileModal(showCreateProfileModalFromHome);
    }, [showCreateProfileModalFromHome]);

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

    const handleOpenManageProfilesModal = () => {
        setShowManageProfilesModal(true);
        logActivity(ActivityType.PROFILE_MANAGEMENT_MODAL_OPENED, activeProfileId);
    };

    const handleCloseManageProfilesModal = () => {
        setShowManageProfilesModal(false);
        logActivity(ActivityType.PROFILE_MANAGEMENT_MODAL_CLOSED, activeProfileId);
    };

    const handleCloseCreateProfileModal = () => {
        setShowCreateProfileModal(false);
        setShowCreateProfileModalFromHome(false); // Also reset the state in App.js
    };

    const handleProfileClick = (profileId) => {
        setActiveProfileId(profileId);
    };

    const visibleProfiles = profiles.filter(profile => !profile.is_hidden);

    const groupedProfiles = visibleProfiles.reduce((acc, profile) => {
        const type = profile.profile_type || 'UNCATEGORIZED'; // Handle cases where profile_type might be missing
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(profile);
        return acc;
    }, {});

    const getProfileTypeIcon = (profileType) => {
        switch (profileType) {
            case 'EXPENSE_MANAGER':
                return <Briefcase className="me-2" />;
            case 'ASSET_MANAGER':
                return <GraphUp className="me-2" />;
            default:
                return null;
        }
    };

    return (
        <div className="sidebar-container">
            <ListGroup>
                {Object.entries(groupedProfiles).map(([type, profilesInGroup]) => (
                    <div key={type}>
                        <ListGroup.Item className="sidebar-group-heading text-uppercase fw-bold" active={false}>
                            {getProfileTypeIcon(type)}
                            {type.replace('_', ' ')}
                        </ListGroup.Item>
                        {profilesInGroup.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => handleProfileClick(profile.id)}
                                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center sidebar-profile-item ${profile.id === activeProfileId ? 'active' : ''} profile-type-${profile.profile_type.toLowerCase().replace('_', '-')}`}
                            >
                                <div className="d-flex align-items-center">
                                    <span style={{ fontSize: '1.2rem', marginRight: '5px' }}>{getFlagEmoji(profile.currency)}</span> {/* Display flag emoji */}
                                    <span className="profile-name-on-hover">{profile.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </ListGroup>
            <div className="sidebar-bottom-buttons">
                <Button variant="primary" className="mt-2 w-100 btn-icon-only" onClick={() => setShowCreateProfileModal(true)}> {/* Adjusted margin and width */}
                    <PlusCircle />
                </Button>
                <Dropdown className="mt-2 w-100">
                    <Dropdown.Toggle as={Button} variant="secondary" id="dropdown-custom-components" className="w-100 btn-icon-only">
                        <PersonGear />
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                        <Dropdown.Item onClick={handleOpenManageProfilesModal}><Gear className="me-2" />Manage Profiles</Dropdown.Item>
                        <Dropdown.Item onClick={() => setShowUserProfileEditModal(true)}><Pencil className="me-2" />Edit Profile</Dropdown.Item>
                        <Dropdown.Item onClick={() => setShowChangePasswordModal(true)}><Key className="me-2" />Change Password</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>

            <CreateProfileModal
                show={showCreateProfileModal}
                handleClose={handleCloseCreateProfileModal}
                handleCreateProfile={handleCreateProfile}
            />

            <ManageProfilesModal
                show={showManageProfilesModal}
                handleClose={handleCloseManageProfilesModal}
                profiles={profiles} // Pass profiles to ManageProfilesModal
                onProfileVisibilityChange={onProfileVisibilityChange}
                handleUpdateProfile={handleUpdateProfile}
                handleDeleteProfile={handleDeleteProfile}
            />

            <UserProfileEditModal
                show={showUserProfileEditModal}
                handleClose={() => setShowUserProfileEditModal(false)}
            />

            <ChangePasswordModal
                show={showChangePasswordModal}
                handleClose={() => setShowChangePasswordModal(false)}
            />
        </div>
    );
};

export default SideBar;