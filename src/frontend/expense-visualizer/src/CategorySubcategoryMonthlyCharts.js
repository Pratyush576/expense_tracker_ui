import React from 'react';
import { Card } from 'react-bootstrap';
import SubcategoryMonthlyLineChart from './SubcategoryMonthlyLineChart';

const CategorySubcategoryMonthlyCharts = ({ data, budgets, selectedYear, excludedCategories, currency, activeProfileId }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-4 shadow-lg">
        <Card.Header>Monthly Subcategory Trends by Main Category</Card.Header>
        <Card.Body>
          <p>No monthly category expense data available for charting.</p>
        </Card.Body>
      </Card>
    );
  }

  // Extract all unique main categories
  const allMainCategories = [...new Set(data.map(item => item.Category))];

  return (
    <div className="category-subcategory-charts">
      <h3 className="my-4">Monthly Subcategory Trends by Main Category</h3>
      {allMainCategories.map(mainCategory => (
                  <SubcategoryMonthlyLineChart
                    key={mainCategory}
                    data={data} // Pass all data, the child component will filter
                    mainCategoryName={mainCategory}
                    budgets={budgets} // Pass budgets here
                    selectedYear={selectedYear} // Pass selectedYear here
                    currency={currency} // Pass currency here
                    activeProfileId={activeProfileId} // Pass activeProfileId here
                  />
      ))}
    </div>
  );
};

export default CategorySubcategoryMonthlyCharts;
