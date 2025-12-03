import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Card, Row, Col, ListGroup, Modal, InputGroup, Collapse, Tab, Tabs } from 'react-bootstrap';
import { ChevronDown, ChevronUp } from 'react-bootstrap-icons';
import ConfirmationModal from './ConfirmationModal'; // Import ConfirmationModal
import { formatCurrency } from './utils/currency'; // Import formatCurrency
import PaymentSourceManager from './components/PaymentSourceManager'; // Import PaymentSourceManager

// Helper function to check for budget overlap
const isBudgetOverlap = (newBudget, existingBudgets) => {
  const newCategory = newBudget.category;
  const newYear = newBudget.year;
  const newMonths = newBudget.months; // [] for "All Months"

  for (const existingBudget of existingBudgets) {
    const existingCategory = existingBudget.category;
    const existingYear = existingBudget.year;
    const existingMonths = existingBudget.months; // [] for "All Months"

    // Rule 1: Categories must match
    if (newCategory !== existingCategory) {
      continue; // No overlap if categories are different
    }

    // Rule 2: Check for year overlap
    if (newYear !== existingYear) {
      continue; // No overlap if years are different
    }

    // Rule 3: Check for month overlap
    // Case A: Both new and existing budgets are for "All Months" (months array is empty)
    if (newMonths.length === 0 && existingMonths.length === 0) {
      return true; // Overlap: (Category, Year, All Months) vs (Category, Year, All Months)
    }
    // Case B: One is "All Months" and the other has specific months
    if (newMonths.length === 0 || existingMonths.length === 0) {
      return true;
    }
    // Case C: Both have specific months, check for intersection
    const monthIntersection = newMonths.filter(month => existingMonths.includes(month));
    if (monthIntersection.length > 0) {
      return true; // Overlap: (Category, Year, [1,2]) vs (Category, Year, [2,3])
    }
  }
  return false; // No overlap found
};

const Settings = ({ settings, onSave, currency, profileId, profileType }) => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategoryInputs, setNewSubcategoryInputs] = useState({}); // State for new subcategory inputs per category
  const [openSubcategories, setOpenSubcategories] = useState({}); // State for collapsible subcategories

  // Budget states
  const [budgets, setBudgets] = useState([]);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetYear, setNewBudgetYear] = useState(new Date().getFullYear().toString()); // Default to current year
  const [newBudgetMonth, setNewBudgetMonth] = useState([]); // Array for multiple months
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [editingBudgetIndex, setEditingBudgetIndex] = useState(null); // Index of budget being edited

  // Currency state
  const [currentCurrency, setCurrentCurrency] = useState(settings.currency || 'USD');

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [currentCategoryEdit, setCurrentCategoryEdit] = useState({ index: null, name: '', subcategories: [] });

  // State for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState(null);

  // State for active sub-tab in Settings
  const [settingsSubTabKey, setSettingsSubTabKey] = useState('categories');

  useEffect(() => {
    setCategories(settings.categories || []);
    setBudgets(settings.budgets || []); // Initialize budgets
    setCurrentCurrency(settings.currency || 'USD'); // Initialize currentCurrency
    // Initialize all subcategories to be collapsed by default
    const initialCollapseState = {};
    if (settings.categories) {
      settings.categories.forEach((_, index) => {
        initialCollapseState[index] = false;
      });
    }
    setOpenSubcategories(initialCollapseState);
  }, [settings]);

  const handleSave = () => {
    onSave({ categories, rules: settings.rules, budgets, currency: currentCurrency }); // Pass existing rules and new budgets back
  };

  // Category Management Handlers
  const handleAddCategory = () => {
    if (newCategory && !categories.find(c => c.name === newCategory)) {
      const updatedCategories = [...categories];
      updatedCategories.push({ name: newCategory, subcategories: [] });
      setCategories(updatedCategories);
      onSave({ categories: updatedCategories, rules: settings.rules, budgets });
      setNewCategory('');
    }
  };

  const handleDeleteCategoryClick = (index) => {
    const categoryToDelete = categories[index];
    setConfirmModalTitle('Confirm Category Deletion');
    setConfirmModalMessage(`Are you sure you want to delete the category "${categoryToDelete.name}"? All associated rules and budgets will also be removed. This action cannot be undone.`);
    setConfirmModalAction(() => () => _deleteCategory(index));
    setShowConfirmModal(true);
  };

  const _deleteCategory = (index) => {
    const categoryToDelete = categories[index];
    const updatedCategories = categories.filter((_, i) => i !== index);
    setCategories(updatedCategories);
    const updatedRules = settings.rules.filter(rule => rule.category !== categoryToDelete.name);
    const updatedBudgets = budgets.filter(budget => budget.category !== categoryToDelete.name); // Also filter budgets
    onSave({ categories: updatedCategories, rules: updatedRules, budgets: updatedBudgets });
    setShowConfirmModal(false);
  };

  const handleUpdateCategory = (index, newName) => {
    const oldName = categories[index].name;
    const updatedCategories = [...categories];
    updatedCategories[index].name = newName;
    setCategories(updatedCategories);
    const updatedRules = settings.rules.map(rule => {
      if (rule.category === oldName) {
        return { ...rule, category: newName };
      }
      return rule;
    });
    const updatedBudgets = budgets.map(budget => { // Also update budgets
      if (budget.category === oldName) {
        return { ...budget, category: newName };
      }
      return budget;
    });
    onSave({ categories: updatedCategories, rules: updatedRules, budgets: updatedBudgets });
  };
  
  const handleAddSubcategory = (categoryIndex) => {
    const subcategoryName = newSubcategoryInputs[categoryIndex];
    if (subcategoryName && !categories[categoryIndex].subcategories.includes(subcategoryName)) {
      const updatedCategories = [...categories];
      updatedCategories[categoryIndex].subcategories.push(subcategoryName);
      setCategories(updatedCategories);
      onSave({ categories: updatedCategories, rules: settings.rules, budgets });
      setNewSubcategoryInputs(prev => ({ ...prev, [categoryIndex]: '' })); // Clear input for this category
    }
  };

  const handleDeleteSubcategoryClick = (categoryIndex, subcategoryIndex) => {
    const categoryName = categories[categoryIndex].name;
    const subcategoryToDelete = categories[categoryIndex].subcategories[subcategoryIndex];
    setConfirmModalTitle('Confirm Subcategory Deletion');
    setConfirmModalMessage(`Are you sure you want to delete the subcategory "${subcategoryToDelete}" from category "${categoryName}"? All associated rules will also be removed. This action cannot be undone.`);
    setConfirmModalAction(() => () => _deleteSubcategory(categoryIndex, subcategoryIndex));
    setShowConfirmModal(true);
  };

  const _deleteSubcategory = (categoryIndex, subcategoryIndex) => {
    const subcategoryToDelete = categories[categoryIndex].subcategories[subcategoryIndex];
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].subcategories = updatedCategories[categoryIndex].subcategories.filter((_, i) => i !== subcategoryIndex);
    const updatedRules = settings.rules.filter(rule => rule.subcategory !== subcategoryToDelete);
    setCategories(updatedCategories);
    onSave({ categories: updatedCategories, rules: updatedRules, budgets: budgets });
    setShowConfirmModal(false);
  };

  const handleEditCategoryClick = (index) => {
    setCurrentCategoryEdit({ index, name: categories[index].name, subcategories: categories[index].subcategories });
    setShowCategoryModal(true);
  };

  const handleSaveCategoryModal = () => {
    handleUpdateCategory(currentCategoryEdit.index, currentCategoryEdit.name);
    setShowCategoryModal(false);
  };

  const toggleSubcategories = (index) => {
    setOpenSubcategories(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Budget Management Handlers
  const handleAddUpdateBudget = () => {
    if (!newBudgetCategory || !newBudgetYear || !newBudgetAmount || isNaN(parseFloat(newBudgetAmount)) || parseFloat(newBudgetAmount) <= 0) {
      alert('Please select a category, year, and enter a valid positive amount for the budget.');
      return;
    }

    const newBudget = {
      category: newBudgetCategory,
      amount: parseFloat(newBudgetAmount),
      year: parseInt(newBudgetYear),
      months: newBudgetMonth.length === 0 ? [] : newBudgetMonth.map(Number), // Set months to empty array if empty array
    };

    // Filter out the budget being edited from the existing budgets for validation
    const budgetsForValidation = budgets.filter((_, i) => i !== editingBudgetIndex);

    if (isBudgetOverlap(newBudget, budgetsForValidation)) {
      alert('Budget overlap detected! Please ensure no two budgets for the same category cover the same time frame.');
      return;
    }

    let updatedBudgets;
    if (editingBudgetIndex !== null) {
      updatedBudgets = budgets.map((budget, index) =>
        index === editingBudgetIndex ? newBudget : budget
      );
      setEditingBudgetIndex(null);
    } else {
      updatedBudgets = [...budgets, newBudget];
    }
    setBudgets(updatedBudgets);
    onSave({ categories, rules: settings.rules, budgets: updatedBudgets });
    setNewBudgetCategory('');
    setNewBudgetAmount('');
    setNewBudgetYear(new Date().getFullYear().toString()); // Reset to current year
    setNewBudgetMonth([]); // Reset to empty array
  };

  const handleEditBudget = (index) => {
    const budgetToEdit = budgets[index];
    setNewBudgetCategory(budgetToEdit.category);
    setNewBudgetYear(budgetToEdit.year ? budgetToEdit.year.toString() : new Date().getFullYear().toString()); // Default to current year if null
    setNewBudgetMonth(budgetToEdit.months ? budgetToEdit.months.map(String) : []); // Set to empty array if null or undefined
    setNewBudgetAmount(budgetToEdit.amount.toString());
    setEditingBudgetIndex(index);
  };

  const handleDeleteBudgetClick = (index) => {
    const budgetToDelete = budgets[index];
    setConfirmModalTitle('Confirm Budget Deletion');
    setConfirmModalMessage(`Are you sure you want to delete the budget for "${budgetToDelete.category}" for ${budgetToDelete.months && budgetToDelete.months.length > 0 ? budgetToDelete.months.map(monthNum => new Date(0, monthNum - 1).toLocaleString('default', { month: 'long' })).join(', ') + ' ' : ''}${budgetToDelete.year} with amount ${budgetToDelete.amount.toFixed(2)}? This action cannot be undone.`);
    setConfirmModalAction(() => () => _deleteBudget(index));
    setShowConfirmModal(true);
  };

  const _deleteBudget = (index) => {
    const updatedBudgets = budgets.filter((_, i) => i !== index);
    setBudgets(updatedBudgets);
    onSave({ categories, rules: settings.rules, budgets: updatedBudgets });
    setShowConfirmModal(false);
  };

  const availableCategories = [{ name: "ALL_CATEGORIES", subcategories: [] }, ...categories];

  return (
    <div>
      <Tabs activeKey={settingsSubTabKey} onSelect={(k) => setSettingsSubTabKey(k)} className="mb-3">
        <Tab eventKey="categories" title="Categories and Subcategories">
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">Categories and Subcategories</Card.Header>
            <Card.Body>
              {settings.categories && settings.categories.map((category, index) => (
                <Card key={index} className="mb-3 border-info">
                  <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center" onClick={() => toggleSubcategories(index)} style={{ cursor: 'pointer' }}>
                    <strong>{category.name}</strong>
                    <div>
                      {openSubcategories[index] ? <ChevronUp /> : <ChevronDown />}
                      <Button variant="light" size="sm" className="ms-2" onClick={(e) => { e.stopPropagation(); handleEditCategoryClick(index); }}>Edit</Button>{' '}
                      <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteCategoryClick(index); }}>Delete</Button>
                    </div>
                  </Card.Header>
                  <Collapse in={openSubcategories[index]}>
                    <div id={`subcategories-${index}`}>
                      <Card.Body>
                        <ListGroup>
                          {category.subcategories && category.subcategories.map((subcategory, subIndex) => (
                            <ListGroup.Item key={subIndex} className="d-flex justify-content-between align-items-center">
                              {subcategory}
                              <Button variant="danger" size="sm" onClick={() => handleDeleteSubcategoryClick(index, subIndex)}>Delete</Button>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                        <InputGroup className="mt-3">
                          <Form.Control
                            type="text"
                            value={newSubcategoryInputs[index] || ''}
                            onChange={(e) => setNewSubcategoryInputs(prev => ({ ...prev, [index]: e.target.value }))}
                            placeholder="New subcategory name"
                          />
                          <Button variant="success" onClick={() => handleAddSubcategory(index)}>Add Subcategory</Button>
                        </InputGroup>
                      </Card.Body>
                    </div>
                  </Collapse>
                </Card>
              ))}
              <InputGroup className="mt-3">
                <Form.Control
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                />
                <Button variant="success" onClick={handleAddCategory}>Add Category</Button>
              </InputGroup>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="budgets" title="Budget Management">
          {/* Budget Management Section */}
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">Budget Management</Card.Header>
            <Card.Body>
              <Form>
                <Row className="mb-3">
                  <Form.Group as={Col} controlId="formCurrency">
                    <Form.Label>Currency</Form.Label>
                    <Form.Control
                      as="select"
                      value={currentCurrency}
                      onChange={(e) => setCurrentCurrency(e.target.value)}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="AUD">AUD (A$)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="CHF">CHF (CHF)</option>
                      <option value="CNY">CNY (¥)</option>
                      <option value="SEK">SEK (kr)</option>
                      <option value="NZD">NZD (NZ$)</option>
                    </Form.Control>
                  </Form.Group>
                </Row>
                <Row className="mb-3">
                  <Form.Group as={Col} controlId="formBudgetCategory">
                    <Form.Label>Category</Form.Label>
                    <Form.Control
                      as="select"
                      value={newBudgetCategory}
                      onChange={(e) => setNewBudgetCategory(e.target.value)}
                    >
                      <option value="">Select Category</option>
                      {availableCategories.map((cat, index) => (
                        <option key={index} value={cat.name}>{cat.name}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>

                  <Form.Group as={Col} controlId="formBudgetYear">
                    <Form.Label>Year</Form.Label>
                    <Form.Control
                      as="select"
                      value={newBudgetYear}
                      onChange={(e) => setNewBudgetYear(e.target.value)}
                    >
                      {/* Generate years dynamically, e.g., current year +/- 5 */}
                      {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>

                  <Form.Group as={Col} controlId="formBudgetMonth">
                    <Form.Label>Months</Form.Label>
                    <Form.Control
                      as="select"
                      multiple
                      value={newBudgetMonth}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions);
                        const selectedMonths = selectedOptions
                          .filter(option => option.value !== "") // Filter out "All Months" option's empty string value
                          .map(option => parseInt(option.value));
                        setNewBudgetMonth(selectedMonths);
                      }}
                    >
                      <option value="">All Months</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(monthNum => (
                        <option key={monthNum} value={monthNum}>{new Date(0, monthNum - 1).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </Form.Control>
                  </Form.Group>

                  <Form.Group as={Col} controlId="formBudgetAmount">
                    <Form.Label>Amount</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Budget amount"
                      value={newBudgetAmount}
                      onChange={(e) => setNewBudgetAmount(e.target.value)}
                      min="0.01"
                      step="0.01"
                    />
                  </Form.Group>
                </Row>
                <Button variant={editingBudgetIndex !== null ? "warning" : "success"} onClick={handleAddUpdateBudget}>
                  {editingBudgetIndex !== null ? "Update Budget" : "Add Budget"}
                </Button>
                {editingBudgetIndex !== null && (
                  <Button variant="secondary" className="ms-2" onClick={() => {
                    setEditingBudgetIndex(null);
                    setNewBudgetCategory('');
                    setNewBudgetAmount('');
                    setNewBudgetYear(new Date().getFullYear().toString()); // Reset to current year
                    setNewBudgetMonth([]); // Reset to empty array
                  }}>
                    Cancel Edit
                  </Button>
                )}
              </Form>

              <h5 className="mt-4">Current Budgets</h5>
              {budgets.length === 0 ? (
                <p>No budgets configured yet.</p>
              ) : (
                <Table striped bordered hover size="sm" className="mt-3">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Year</th>
                      <th>Months</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sort budgets by year (descending, 'All Years' first) and then by month (ascending, 'All Months' first) */}
                    {[...budgets].sort((a, b) => {
                      // Sort by Year
                      if (a.year !== b.year) return b.year - a.year; // Latest year first

                      // If years are the same, sort by Months
                      const aMonths = a.months || [];
                      const bMonths = b.months || [];

                      if (aMonths.length === 0 && bMonths.length !== 0) return -1;
                      if (aMonths.length !== 0 && bMonths.length === 0) return 1;
                      if (aMonths.length !== 0 && bMonths.length !== 0) {
                        const minAMonth = Math.min(...aMonths);
                        const minBMonth = Math.min(...bMonths);
                        if (minAMonth !== minBMonth) return minAMonth - minBMonth;
                      }

                      // If years and months are the same, sort by category
                      return a.category.localeCompare(b.category);
                    }).map((budget) => {
                      const originalIndex = budgets.indexOf(budget);
                      return (
                      <tr key={originalIndex}>
                        <td>{budget.category}</td>
                        <td>{budget.year}</td>
                        <td>{budget.months && budget.months.length > 0 ? budget.months.map(monthNum => new Date(0, monthNum - 1).toLocaleString('default', { month: 'short' })).join(', ') : 'All'}</td>
                        <td>{formatCurrency(budget.amount, currentCurrency)}</td>
                        <td>
                          <Button variant="info" size="sm" onClick={() => handleEditBudget(originalIndex)}>Edit</Button>{' '}
                          <Button variant="danger" size="sm" onClick={() => handleDeleteBudgetClick(originalIndex)}>Delete</Button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="paymentSources" title="Manage Payment Sources">
          {/* Payment Source Management Section */}
          <PaymentSourceManager profileId={profileId} />
        </Tab>
      </Tabs>

      <div className="mt-4 text-center">
        <Button variant="success" size="lg" onClick={handleSave}>Save All Settings</Button>
      </div>

      {/* Category Edit Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>Edit Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Category Name</Form.Label>
            <Form.Control
              type="text"
              value={currentCategoryEdit.name}
              onChange={(e) => setCurrentCategoryEdit({ ...currentCategoryEdit, name: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSaveCategoryModal}>
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
    </div>
  );
};

export default Settings;