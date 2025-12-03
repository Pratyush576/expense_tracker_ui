import React from 'react';
import { Table } from 'react-bootstrap';
import { formatCurrency } from './utils/currency';

const MonthlySummaryTable = ({ income, expenses, selectedPaymentSource, currency }) => {
  const filterTransactionsByPaymentSource = (transactions) => {
    if (!selectedPaymentSource) {
      return transactions;
    }
    return transactions.filter(t => t.payment_source === selectedPaymentSource);
  };

  const processMonthlyData = (transactions) => {
    return transactions.reduce((acc, transaction) => {
      // Manually parse date to ensure consistent behavior across environments
      const parts = transaction.date.split('/'); // Assuming MM/DD/YYYY format
      const monthYear = `${parts[2]}-${parts[0]}`; // YYYY-MM format
      const amount = transaction.amount;

      //console.log("year {}, Month {}",year, month )
      if (!acc[monthYear]) {
        acc[monthYear] = 0;
      }
      acc[monthYear] += amount;
      return acc;
    }, {});
  };

  //console.log(processMonthlyData)
  const filteredIncome = filterTransactionsByPaymentSource(income);
  const monthlyIncomeMap = processMonthlyData(filteredIncome);

  console.log("DEBUG: expenses: " + JSON.stringify(expenses))
  const filteredExpenses = filterTransactionsByPaymentSource(expenses);
  console.log("DEBUG: filteredExpenses: " + JSON.stringify(filteredExpenses))
  const monthlyExpensesMap = processMonthlyData(filteredExpenses);
  console.log("DEBUG: monthlyExpensesMap: " + JSON.stringify(monthlyExpensesMap))

  const allMonthYearsSet = new Set([...Object.keys(monthlyIncomeMap), ...Object.keys(monthlyExpensesMap)]);
  const allMonthYears = Array.from(allMonthYearsSet).sort(); // Sort chronologically
  console.log("DEBUG: allMonthYears: " + JSON.stringify(allMonthYears))
  const monthlySummary = allMonthYears.map(monthYear => {
    const [year, month] = monthYear.split('-');
    const income = monthlyIncomeMap[monthYear] || 0;
    const expense = monthlyExpensesMap[monthYear] || 0;
    const netIncome = income + expense;
    return { monthYear, year, month, income, expense, netIncome };
  });

  return (
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Month</th>
          <th>Year</th>
          <th>Income</th>
          <th>Expense</th>
          <th>Net Income</th>
        </tr>
      </thead>
      <tbody>
        {monthlySummary.map((data, index) => (
          <tr key={index}>
            <td>{new Date(`${data.year}-${data.month}-02`).toLocaleString('default', { month: 'long' })}</td>
            <td>{data.year}</td>
            <td className="text-success">{formatCurrency(data.income, currency)}</td>
            <td className="text-danger">{formatCurrency(Math.abs(data.expense), currency)}</td>
            <td className={data.netIncome >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(data.netIncome, currency)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default MonthlySummaryTable;