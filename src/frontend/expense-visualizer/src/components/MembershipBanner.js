import React from 'react';
import { Alert, Button } from 'react-bootstrap';

const MembershipBanner = ({ onUpgradeClick }) => {
  return (
    <Alert variant="info" className="d-flex justify-content-between align-items-center mt-3">
      <div>
        <strong>You are on the Free Plan.</strong> Upgrade to Premium to unlock all features.
      </div>
      <Button variant="primary" onClick={onUpgradeClick}>
        Upgrade Now
      </Button>
    </Alert>
  );
};

export default MembershipBanner;
