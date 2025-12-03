import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Card, Row, Col, ListGroup, Modal, InputGroup, Collapse } from 'react-bootstrap';
import ComplexRuleBuilder from './ComplexRuleBuilder'; // Import the new component
import ConfirmationModal from './ConfirmationModal'; // Import ConfirmationModal

const RulesTab = ({ settings, onSave, categories, paymentSources }) => {
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({
    category: '',
    subcategory: '',
    logical_operator: 'AND',
    conditions: [{ field: 'Description', rule_type: 'contains', value: '' }],
    note: ''
  });
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [currentRuleEdit, setCurrentRuleEdit] = useState(null);

  // State for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState(null);

  useEffect(() => {
    setRules(settings.rules || []);
  }, [settings]);

  const handleAddRule = () => {
    if (newRule.category && newRule.conditions.length > 0) {
      const updatedRules = [...rules, newRule];
      setRules(updatedRules);
      onSave({ ...settings, rules: updatedRules }); // Save updated rules to settings
      setNewRule({
        category: '',
        subcategory: '',
        logical_operator: 'AND',
        conditions: [{ field: 'Description', rule_type: 'contains', value: '' }],
        note: ''
      });
    }
  };

  const handleDeleteRuleClick = (index) => {
    setConfirmModalTitle('Confirm Rule Deletion');
    setConfirmModalMessage('Are you sure you want to delete this rule? This action cannot be undone.');
    setConfirmModalAction(() => () => _deleteRule(index));
    setShowConfirmModal(true);
  };

  const _deleteRule = (index) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    onSave({ ...settings, rules: updatedRules }); // Save updated rules to settings
    setShowConfirmModal(false);
  };

  const handleUpdateRule = (index, updatedRule) => {
    const updatedRules = [...rules];
    updatedRules[index] = updatedRule;
    setRules(updatedRules);
    onSave({ ...settings, rules: updatedRules }); // Save updated rules to settings
  };

  const handleEditRuleClick = (index) => {
    setCurrentRuleEdit({ index, ...rules[index] });
    setShowRuleModal(true);
  };

  const handleSaveRuleModal = () => {
    const { index, ...ruleToSave } = currentRuleEdit;
    handleUpdateRule(index, ruleToSave);
    setShowRuleModal(false);
  };

  return (
    <Card className="mt-4">
      <Card.Header className="bg-primary text-white">Rules</Card.Header>
      <Card.Body>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Conditions</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules && rules.map((rule, index) => (
              <tr key={index}>
                <td>{rule.category}</td>
                <td>{rule.subcategory}</td>
                <td>
                  {rule.conditions && rule.conditions.map((c, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div style={{ fontWeight: 'bold', margin: '5px 0' }}>{rule.logical_operator}</div>}
                      <div>
                        <span style={{ color: 'blue', fontWeight: 'bold' }}>{c.field}</span>{' '}
                        <span style={{ color: 'green' }}>{c.rule_type}</span>{' '}
                        <span style={{ color: 'red' }}>{JSON.stringify(c.value)}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </td>
                <td>{rule.note}</td>
                <td>
                  <Button variant="warning" size="sm" onClick={() => handleEditRuleClick(index)}>Edit</Button>{' '}
                  <Button variant="danger" size="sm" onClick={() => handleDeleteRuleClick(index)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Card className="mt-3">
          <Card.Header>Add New Rule</Card.Header>
          <Card.Body>
            <ComplexRuleBuilder
              rule={newRule}
              onRuleChange={setNewRule}
              categories={categories}
              paymentSources={paymentSources}
            />
            <Button variant="primary" onClick={handleAddRule} className="mt-3">Add Rule</Button>
          </Card.Body>
        </Card>
      </Card.Body>

      {/* Rule Edit Modal */}
      <Modal show={showRuleModal} onHide={() => setShowRuleModal(false)} size="lg">
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>Edit Rule</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentRuleEdit && (
            <ComplexRuleBuilder
              rule={currentRuleEdit}
              onRuleChange={setCurrentRuleEdit}
              categories={categories}
              paymentSources={paymentSources}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRuleModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSaveRuleModal}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        show={showConfirmModal}
        title={confirmModalTitle}
        message={confirmModalMessage}
        onConfirm={confirmModalAction}
        onCancel={() => setShowConfirmModal(false)}
      />
    </Card>
  );
};

export default RulesTab;
