import React from 'react';
import { Form, Button, Row, Col, InputGroup } from 'react-bootstrap';
import { PlusCircle, Trash } from 'react-bootstrap-icons';

const ComplexRuleBuilder = ({ rule, onRuleChange, categories, paymentSources }) => {
  const handleConditionChange = (index, fieldName, newValue) => {
    const newConditions = [...rule.conditions];
    const currentCondition = { ...newConditions[index] };

    if (fieldName === 'field') {
      currentCondition.field = newValue;
      // Reset rule_type and value when field changes
      switch (newValue) {
        case 'Date':
          currentCondition.rule_type = 'equal';
          currentCondition.value = '';
          break;
        case 'Payment Source':
          currentCondition.rule_type = 'in';
          currentCondition.value = [];
          break;
        case 'Amount':
          currentCondition.rule_type = 'equals';
          currentCondition.value = '';
          break;
        default: // Description
          currentCondition.rule_type = 'contains';
          currentCondition.value = '';
          break;
      }
    } else if (fieldName === 'rule_type') {
      currentCondition.rule_type = newValue;
      // Initialize value for range type
      if (currentCondition.field === 'Date' && newValue === 'range') {
        currentCondition.value = { start: '', end: '' };
      } else if (currentCondition.field === 'Payment Source' && newValue === 'in') {
        currentCondition.value = [];
      } else if (currentCondition.field === 'Payment Source' && newValue === 'not_in') {
        currentCondition.value = [];
      } else {
        currentCondition.value = '';
      }
    } else {
      currentCondition[fieldName] = newValue;
    }

    newConditions[index] = currentCondition;
    onRuleChange({ ...rule, conditions: newConditions });
  };

  const addCondition = () => {
    onRuleChange({
      ...rule,
      conditions: [...rule.conditions, { field: 'Description', rule_type: 'contains', value: '' }],
    });
  };

  const removeCondition = (index) => {
    const newConditions = rule.conditions.filter((_, i) => i !== index);
    onRuleChange({ ...rule, conditions: newConditions });
  };

  const getRuleTypesForField = (field) => {
    switch (field) {
      case 'Date':
        return ['equal', 'before', 'after', 'range'];
      case 'Payment Source':
        return ['in', 'not in'];
      case 'Description':
        return ['contains', 'exact', 'starts_with', 'ends_with'];
      case 'Amount':
        return ['equals', 'greater_than', 'less_than'];
      default:
        return ['contains', 'exact'];
    }
  };

  return (
    <div>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column sm={2}>Category</Form.Label>
        <Col sm={10}>
          <Form.Control
            as="select"
            value={rule.category}
            onChange={(e) => onRuleChange({ ...rule, category: e.target.value, subcategory: '' })}
          >
            <option value="">Select Category</option>
            {categories.map((category, index) => (
              <option key={index} value={category.name}>{category.name}</option>
            ))}
          </Form.Control>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column sm={2}>Subcategory</Form.Label>
        <Col sm={10}>
          <Form.Control
            as="select"
            value={rule.subcategory}
            onChange={(e) => onRuleChange({ ...rule, subcategory: e.target.value })}
            disabled={!rule.category}
          >
            <option value="">Select Subcategory</option>
            {rule.category &&
              categories.find(c => c.name === rule.category)?.subcategories.map((subcategory, index) => (
                <option key={index} value={subcategory}>{subcategory}</option>
              ))}
          </Form.Control>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column sm={2}>Logical Operator</Form.Label>
        <Col sm={10}>
          <Form.Control
            as="select"
            value={rule.logical_operator}
            onChange={(e) => onRuleChange({ ...rule, logical_operator: e.target.value })}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </Form.Control>
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-3">
        <Form.Label column sm={2}>Note</Form.Label>
        <Col sm={10}>
          <Form.Control
            type="text"
            value={rule.note || ''}
            onChange={(e) => onRuleChange({ ...rule, note: e.target.value })}
            placeholder="Optional note for the rule"
          />
        </Col>
      </Form.Group>

      {rule.conditions.map((condition, index) => (
        <Row key={index} className="mb-3 align-items-center">
          <Col md={3}>
            <Form.Control
              as="select"
              value={condition.field}
              onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
            >
              <option value="Description">Description</option>
              <option value="Date">Date</option>
              <option value="Payment Source">Payment Source</option>
              <option value="Amount">Amount</option>
            </Form.Control>
          </Col>
          <Col md={3}>
            <Form.Control
              as="select"
              value={condition.rule_type}
              onChange={(e) => handleConditionChange(index, 'rule_type', e.target.value)}
            >
              {getRuleTypesForField(condition.field).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Form.Control>
          </Col>
          <Col md={5}>
            {condition.field === 'Date' && condition.rule_type === 'range' ? (
              <InputGroup>
                <Form.Control
                  type="date"
                  value={condition.value.start || ''}
                  onChange={(e) => handleConditionChange(index, 'value', { ...condition.value, start: e.target.value })}
                />
                <Form.Control
                  type="date"
                  value={condition.value.end || ''}
                  onChange={(e) => handleConditionChange(index, 'value', { ...condition.value, end: e.target.value })}
                />
              </InputGroup>
            ) : condition.field === 'Date' ? (
              <Form.Control
                type="date"
                value={condition.value}
                onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
              />
            ) : condition.field === 'Payment Source' ? (
              <Form.Control
                as="select"
                multiple
                value={Array.isArray(condition.value) ? condition.value : [condition.value]}
                onChange={(e) => handleConditionChange(index, 'value', Array.from(e.target.selectedOptions, option => option.value))}
              >
                {paymentSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </Form.Control>
            ) : (
              <Form.Control
                type="text"
                value={condition.value}
                onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
              />
            )}
          </Col>
          <Col md={1}>
            <Button variant="danger" onClick={() => removeCondition(index)}>
              <Trash />
            </Button>
          </Col>
        </Row>
      ))}
      <Button variant="primary" onClick={addCondition}>
        <PlusCircle /> Add Condition
      </Button>
    </div>
  );
};

export default ComplexRuleBuilder;
