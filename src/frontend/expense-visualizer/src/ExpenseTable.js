import React, { useState, useEffect } from 'react';
import { Table, Pagination, Form, Button, Modal, Row, Col } from 'react-bootstrap';
import ComplexRuleBuilder from './ComplexRuleBuilder'; // Import the new component
import { formatCurrency } from './utils/currency'; // Import the utility

const ExpenseTable = ({ expenses, categories, onUpdateTransactionCategory, onAddRuleFromTransaction, currency, activeProfileId, onDeleteTransaction }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [categoryFilter, setCategoryFilter] = useState('');

  // State for categorization modal
  const [showCategorizeModal, setShowCategorizeModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [newRule, setNewRule] = useState({
    category: '',
    subcategory: '',
    logical_operator: 'AND',
    conditions: [],
    note: ''
  });

  const [paymentSources, setPaymentSources] = useState([]);

  useEffect(() => {
    if (activeProfileId) {
      fetch(`http://localhost:8000/api/payment_sources?profile_id=${activeProfileId}`)
        .then(response => response.json())
        .then(data => setPaymentSources(data))
        .catch(error => console.error('Error fetching payment sources:', error));
    }
  }, [activeProfileId]);

  const filteredExpenses = expenses.filter(expense => {
    if (!categoryFilter) return true;
    if (categoryFilter === 'Uncategorized') {
      return expense.category === 'UNCATEGORIZED';
    }
    if (categoryFilter.includes(': ')) { // Filtering by subcategory
      const [mainCategory, subCategory] = categoryFilter.split(': ');
      return expense.category === mainCategory && expense.subcategory === subCategory;
    } else { // Filtering by main category
      return expense.category === categoryFilter;
    }
  });

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredExpenses.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when rows per page changes
  };

  const handleCategorizeClick = (transaction) => {
    setCurrentTransaction(transaction);
    setNewRule({
      category: '',
      subcategory: '',
      logical_operator: 'AND',
      conditions: [{ field: 'Description', rule_type: 'contains', value: transaction.description }],
      note: ''
    });
    setShowCategorizeModal(true);
  };

  const handleDeleteClick = (transactionId) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      onDeleteTransaction(transactionId);
    }
  };

  const handleSaveCategorization = () => {
    console.log("handleSaveCategorization called.");
    console.log("Current Transaction:", currentTransaction);
    console.log("New Rule object:", newRule);

    if (currentTransaction && newRule.category && newRule.conditions.length > 0) {
      console.log("Calling onAddRuleFromTransaction with:", newRule);
      onAddRuleFromTransaction(newRule);
      setShowCategorizeModal(false);
    } else {
      console.log("Validation failed for rule creation. Category:", newRule.category, "Conditions length:", newRule.conditions.length);
      alert("Please select a category and add at least one condition for the rule.");
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Group controlId="rowsPerPageSelect">
          <Form.Label className="me-2">Rows per page:</Form.Label>
          <Form.Control as="select" value={rowsPerPage} onChange={handleRowsPerPageChange} style={{ width: '100px', display: 'inline-block' }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </Form.Control>
        </Form.Group>
        <Form.Group controlId="categoryFilter">
          <Form.Label className="me-2">Filter by Category:</Form.Label>
          <Form.Control as="select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '200px', display: 'inline-block' }}>
            <option value="">All Categories</option>
            <option value="Uncategorized">Uncategorized</option>
            {categories && categories.map((categoryObj, index) => (
              <optgroup key={index} label={categoryObj.name}>
                <option value={categoryObj.name}>{categoryObj.name}</option>
                {categoryObj.subcategories.map((subcategory, subIndex) => (
                  <option key={`${index}-${subIndex}`} value={`${categoryObj.name}: ${subcategory}`}>
                    &nbsp;&nbsp;{subcategory}
                  </option>
                ))}
              </optgroup>
            ))}
          </Form.Control>
        </Form.Group>
        <Pagination>
          <Pagination.Prev onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} />
          {[...Array(totalPages)].map((_, index) => (
            <Pagination.Item key={index + 1} active={index + 1 === currentPage} onClick={() => paginate(index + 1)}>
              {index + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} />
        </Pagination>
      </div>

      <Table striped bordered hover responsive className="expense-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Payment Source</th>
            <th>Description</th>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentRows.map((expense, index) => {
            return (
              <tr key={index}>
                <td>{expense.date}</td>
                <td>{expense.payment_source}</td>
                <td>{expense.description}</td>
                <td>{expense.category}</td>
                <td>{expense.subcategory}</td>
                <td>{formatCurrency(expense.amount, currency)}</td>
                <td>
                  {expense.category === 'UNCATEGORIZED' && (
                    <Button variant="info" size="sm" onClick={() => handleCategorizeClick(expense)}>Categorize</Button>
                  )}
                  <Button variant="danger" size="sm" className="ms-2" onClick={() => handleDeleteClick(expense.id)}>Delete</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Categorization Modal */}
      <Modal show={showCategorizeModal} onHide={() => setShowCategorizeModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Categorize Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentTransaction && (
            <>
              <p><strong>Description:</strong> {currentTransaction.description}</p>
              <p><strong>Amount:</strong> {formatCurrency(currentTransaction.amount, currency)}</p>
              <ComplexRuleBuilder
                rule={newRule}
                onRuleChange={setNewRule}
                categories={categories}
                paymentSources={paymentSources}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCategorizeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveCategorization}>
            Create Rule
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ExpenseTable;