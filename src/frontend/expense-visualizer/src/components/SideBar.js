import React, { useState } from 'react';
import { ListGroup, Button } from 'react-bootstrap'; // Import Tooltip and OverlayTrigger
import { PlusCircle, Gear } from 'react-bootstrap-icons'; // Import icons, including PlusCircle and Gear
import CreateProfileModal from './CreateProfileModal';
import ManageProfilesModal from './ManageProfilesModal'; // Import ManageProfilesModal
import { getFlagEmoji } from '../utils/currency'; // Import getFlagEmoji

const SideBar = ({ profiles, activeProfileId, setActiveProfileId, handleCreateProfile, handleUpdateProfile, handleDeleteProfile, onProfileVisibilityChange }) => {
    const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
    const [showManageProfilesModal, setShowManageProfilesModal] = useState(false); // New state for manage profiles modal

    const handleProfileClick = (profileId) => {
        setActiveProfileId(profileId);
    };

    const visibleProfiles = profiles.filter(profile => !profile.is_hidden);

    return (
        <div className="sidebar-container">
            <ListGroup>
                {visibleProfiles.map(profile => (
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
            </ListGroup>
            <div className="sidebar-bottom-buttons">
                <Button variant="primary" className="mt-2 w-100 btn-icon-only" onClick={() => setShowCreateProfileModal(true)}> {/* Adjusted margin and width */}
                    <PlusCircle />
                </Button>
                <Button variant="secondary" className="mt-2 w-100 btn-icon-only" onClick={() => setShowManageProfilesModal(true)}>
                    <Gear />
                </Button>
            </div>

            <CreateProfileModal
                show={showCreateProfileModal}
                handleClose={() => setShowCreateProfileModal(false)}
                handleCreateProfile={handleCreateProfile}
            />

            <ManageProfilesModal
                show={showManageProfilesModal}
                handleClose={() => setShowManageProfilesModal(false)}
                onProfileVisibilityChange={onProfileVisibilityChange}
                handleUpdateProfile={handleUpdateProfile}
                handleDeleteProfile={handleDeleteProfile}
            />
        </div>
    );
};

export default SideBar;