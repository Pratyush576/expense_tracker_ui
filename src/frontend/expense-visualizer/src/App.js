import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import ExpenseTable from './ExpenseTable';
import PaymentSourcePieChart from './PaymentSourcePieChart';
import MonthlySummaryTable from './MonthlySummaryTable';
import PaymentSourceMonthlyBarChart from './PaymentSourceMonthlyBarChart';
import CategoryCostChart from './CategoryCostChart';
import MonthlyCategoryLineChart from './MonthlyCategoryLineChart';
import MonthlyStackedBarChart from './MonthlyStackedBarChart';
import CategorySubcategoryMonthlyCharts from './CategorySubcategoryMonthlyCharts';
import BudgetVisualization from './BudgetVisualization';
import 'bootstrap/dist/css/bootstrap.min.css';
import Settings from './Settings';
import RulesTab from './RulesTab';
import ManualTransactionEntry from './ManualTransactionEntry'; // Import ManualTransactionEntry
import HomePage from './HomePage'; // Import HomePage
import { Tab, Tabs, Row, Col, Alert } from 'react-bootstrap';
import { formatCurrency } from './utils/currency';
import SideBar from './components/SideBar';
import AssetDashboard from './components/AssetDashboard';
import RecordAsset from "./RecordAsset";
import AssetTypeManager from "./components/AssetTypeManager";


function App() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthlyAggregatedExpenses, setMonthlyAggregatedExpenses] = useState([]);
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [paymentSourceFilter, setPaymentSourceFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPaymentSourceForChart, setSelectedPaymentSourceForChart] = useState("");
  const [selectedPaymentSourceForMonthlyTable, setSelectedPaymentSourceForMonthlyTable] = useState("");
  const [settings, setSettings] = useState({ categories: [], rules: [], budgets: [], currency: 'USD' });
  const [categoryCostData, setCategoryCostData] = useState([]);
  const [monthlyCategoryExpenses, setMonthlyCategoryExpenses] = useState([]);
  const [key, setKey] = useState('home'); // Set initial active tab to 'home'
  const [dashboardSubTabKey, setDashboardSubTabKey] = useState('overview');
  const [paymentSources, setPaymentSources] = useState([]);
  const [excludedCategories, setExcludedCategories] = useState(['MONEY_MOVEMENT', 'PROPERTY_INVESTMENT']);
  const [allTransactions, setAllTransactions] = useState([]);
  const [assets, setAssets] = useState([]); // New state for assets
  const [assetTypes, setAssetTypes] = useState([]); // New state for asset types
  const [selectedYearDashboard, setSelectedYearDashboard] = useState(new Date().getFullYear().toString());
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(localStorage.getItem('activeProfileId'));

  console.log("App.js - activeProfileId at start:", activeProfileId);
  const API_BASE_URL = 'http://localhost:8000';


  const fetchData = async () => {
    console.log("App.js - data fetching triggered with activeProfileId:", activeProfileId);
    if (activeProfileId) {
      localStorage.setItem('activeProfileId', activeProfileId);

      try {
        // Fetch the active profile to get its type
        const profileResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}`);
        const activeProfileType = profileResponse.data.profile_type;

        if (activeProfileType === "EXPENSE_MANAGER") {
          const response = await axios.get(`${API_BASE_URL}/api/expenses?profile_id=${activeProfileId}`, { params: { excluded_categories: excludedCategories } });
          console.log("App.js - /api/expenses income response:", response.data.income);
          console.log("App.js - /api/expenses expenses response:", response.data.expenses);
          const allTransactionsWithId = [...response.data.income, ...response.data.expenses].map((t, index) => ({
            ...t,
            id: t.id || `${t.date}-${t.description}-${t.amount}-${t.payment_source}-${index}`
          }));
          setAllTransactions(allTransactionsWithId);
          console.log("App.js - allTransactions:", allTransactionsWithId);
          setSettings(response.data.settings);

          const paymentSourcesResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/payment_sources`);
          setPaymentSources(paymentSourcesResponse.data.map(ps => ps.source_name));
        } else if (activeProfileType === "ASSET_MANAGER") {
          const assetTypesResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/asset_types`);
          setAssetTypes(assetTypesResponse.data);

          const assetsResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/assets`);
          setAssets(assetsResponse.data);
          // For asset manager, settings might include asset types, etc.
          // For now, we'll just set a default currency.
          setSettings(prevSettings => ({ ...prevSettings, currency: profileResponse.data.currency }));
        }
      } catch (error) {
        console.error('Error fetching data: ', error);
      }
    }
  };

  useEffect(() => {
    axios.get('http://localhost:8000/api/profiles')
      .then(response => {
        console.log("App.js - /api/profiles response:", response.data);
        setProfiles(response.data);
        if (!activeProfileId && response.data.length > 0) {
          setActiveProfileId(response.data[0].id);
        }
      })
      .catch(error => {
        console.error('Error fetching profiles: ', error);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeProfileId, key, excludedCategories]);

  useEffect(() => {
    const fetchProfileAndData = async () => {
      if (activeProfileId) {
        try {
          const profileResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}`);
          const activeProfileType = profileResponse.data.profile_type;

          if (activeProfileType === "EXPENSE_MANAGER") {
            const filteredTransactions = allTransactions.filter(t => new Date(t.date).getFullYear().toString() === selectedYearDashboard);
            const filteredIncome = filteredTransactions.filter(t => t.amount >= 0);
            const filteredExpenses = filteredTransactions.filter(t => t.amount < 0);

            setIncome(filteredIncome);
            setExpenses(filteredExpenses);

            axios.get(`${API_BASE_URL}/api/category_costs?profile_id=${activeProfileId}`, { params: { year: selectedYearDashboard, excluded_categories: excludedCategories } })
              .then(response => {
                if (Array.isArray(response.data)) {
                  setCategoryCostData(response.data);
                } else {
                  setCategoryCostData([]);
                }
              })
              .catch(error => {
                console.error('Error fetching category cost data: ', error);
              });

            if (dashboardSubTabKey === 'subcategoryTrends' || dashboardSubTabKey === 'overview') {
              axios.get(`${API_BASE_URL}/api/monthly_category_expenses?profile_id=${activeProfileId}`, { params: { year: selectedYearDashboard, excluded_categories: excludedCategories } })
                .then(response => {
                  if (Array.isArray(response.data)) {
                    const allMonthlyData = response.data;
                    const aggregatedMonthlyExpenses = allMonthlyData.reduce((acc, item) => {
                      const { YearMonth, total_cost } = item;
                      if (!acc[YearMonth]) {
                        acc[YearMonth] = 0;
                      }
                      acc[YearMonth] += total_cost;
                      return acc;
                    }, {});
                    const monthlyAggregatedExpensesArray = Object.keys(aggregatedMonthlyExpenses).map(YearMonth => ({
                      YearMonth,
                      total_cost: aggregatedMonthlyExpenses[YearMonth]
                    }));
                    setMonthlyAggregatedExpenses(monthlyAggregatedExpensesArray);
                    const uniqueMonthYears = [...new Set(allMonthlyData.map(item => item.YearMonth))].sort();
                    const last12MonthYears = uniqueMonthYears.slice(Math.max(uniqueMonthYears.length - 12, 0));
                    const filteredMonthlyData = allMonthlyData.filter(item =>
                      last12MonthYears.includes(item.YearMonth) && !excludedCategories.includes(item.Category)
                    );
                    setMonthlyCategoryExpenses(filteredMonthlyData);
                    console.log("App.js - monthlyCategoryExpenses:", filteredMonthlyData);
                  } else {
                    setMonthlyAggregatedExpenses([]);
                    setMonthlyCategoryExpenses([]);
                    console.log("App.js - monthlyCategoryExpenses: No data or not array.");
                  }
                })
                .catch(error => {
                  console.error('Error fetching monthly category expenses data: ', error);
                });
            } else {
              setMonthlyCategoryExpenses([]);
              setMonthlyAggregatedExpenses([]);
            }
          } else if (activeProfileType === "ASSET_MANAGER") {
            // Asset manager specific data fetching (already handled in fetchData, but ensure consistency)
            // This useEffect primarily handles dashboard-specific data that might change with selectedYearDashboard
            // For ASSET_MANAGER, we might fetch asset summaries or specific asset data here if needed for dashboard charts
            console.log("ASSET_MANAGER profile active, fetching asset data for dashboard if needed.");
            // Example: Fetch asset summary for charts
            axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/assets/summary?year=${selectedYearDashboard}`)
              .then(response => {
                // Process asset summary data for charts
                console.log("Asset summary for dashboard:", response.data);
              })
              .catch(error => {
                console.error('Error fetching asset summary for dashboard:', error);
              });
          }
        } catch (error) {
          console.error('Error fetching profile type:', error);
        }
      }
    };

    fetchProfileAndData();
  }, [activeProfileId, selectedYearDashboard, allTransactions, excludedCategories, dashboardSubTabKey]);

  const handleCreateProfile = (publicId, profileName, currency, profileType) => {
    axios.post('http://localhost:8000/api/profiles', { public_id: publicId, name: profileName, currency: currency, profile_type: profileType })
      .then(response => {
        setProfiles([...profiles, response.data]);
      })
      .catch(error => {
        console.error('Error creating profile: ', error);
      });
  };

  const handleUpdateProfile = (profileId, newName, newCurrency, newProfileType) => {
    axios.put(`http://localhost:8000/api/profiles/${profileId}`, { name: newName, currency: newCurrency, profile_type: newProfileType })
      .then(response => {
        const updatedProfiles = profiles.map(p => p.id === profileId ? response.data : p);
        setProfiles(updatedProfiles);
      })
      .catch(error => {
        console.error('Error updating profile: ', error);
      });
  };

  const handleDeleteProfile = (profileId) => {
    axios.delete(`http://localhost:8000/api/profiles/${profileId}`)
      .then(response => {
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        setProfiles(updatedProfiles);
        if (activeProfileId === profileId) {
          setActiveProfileId(updatedProfiles.length > 0 ? updatedProfiles[0].id : null);
        }
      })
      .catch(error => {
        console.error('Error deleting profile: ', error);
      });
  };

  const handleSaveSettings = (newSettings) => {
    axios.post(`http://localhost:8000/api/settings?profile_id=${activeProfileId}`, newSettings)
      .then(response => {
        alert('Settings saved successfully!');
        setSettings(newSettings);
      })
      .catch(error => {
        console.error('Error saving settings:', error);
      });
  };
  const handleAddRuleFromTransaction = (newRule) => {
    const updatedSettings = {
      ...settings,
      rules: [...settings.rules, newRule]
    };
    handleSaveSettings(updatedSettings);
  };

  const handleUpdateTransactionCategory = (transactionId, newCategoryString) => {
    const [newCategory, newSubcategory] = newCategoryString.split(': ');
    const updatedExpenses = expenses.map(exp =>
      exp.id === transactionId ? { ...exp, category: newCategory, subcategory: newSubcategory } : exp
    );
    const updatedIncome = income.map(inc =>
      inc.id === transactionId ? { ...inc, category: newCategory, subcategory: newSubcategory } : inc
    );
    setExpenses(updatedExpenses);
    setIncome(updatedIncome);

    axios.put(`http://localhost:8000/api/transactions/category`, {
      id: transactionId,
      new_category: newCategoryString
    })
    .catch(error => {
      console.error('Error updating transaction category:', error);
    });
  };

  const handleDeleteTransaction = (transactionId) => {
    axios.delete(`http://localhost:8000/api/transactions/${transactionId}?profile_id=${activeProfileId}`)
      .then(response => {
        console.log("Transaction deleted successfully:", response.data);
        fetchData(); // Refresh data after deletion
      })
      .catch(error => {
        console.error('Error deleting transaction:', error);
      });
  };

  const handleProfileSelect = (profileId) => {
    setActiveProfileId(profileId);
    setKey('profileDashboard'); // Switch to the profile dashboard tab
  };

  const handleProfileVisibilityChange = async () => {
    // Re-fetch profiles to get updated visibility status
    try {
      const response = await axios.get('http://localhost:8000/api/profiles');
      setProfiles(response.data);

      // Check if the currently active profile has been hidden
      const updatedActiveProfile = response.data.find(p => p.id === activeProfileId);
      if (updatedActiveProfile && updatedActiveProfile.is_hidden) {
        setActiveProfileId(null); // Clear active profile
        setKey('home'); // Redirect to home page
      }
    } catch (error) {
      console.error('Error re-fetching profiles after visibility change:', error);
    }
  };

  const filteredIncomeForTotal = income.filter(inc => !excludedCategories.includes(inc.category));
  const totalIncome = filteredIncomeForTotal.reduce((acc, item) => acc + item.amount, 0);
  const filteredExpensesForTotal = expenses.filter(exp => !excludedCategories.includes(exp.category));
  const totalExpenses = filteredExpensesForTotal.reduce((acc, item) => acc + item.amount, 0);
  const netIncome = totalIncome + totalExpenses;
  const allTransactions2 = allTransactions;
  const years = [...new Set(allTransactions.map(t => new Date(t.date).getFullYear().toString()))].sort((a, b) => b - a);
  const months = [
    { name: "January", value: "01" }, { name: "February", value: "02" }, { name: "March", "value": "03" },
    { name: "April", value: "04" }, { name: "May", value: "05" }, { name: "June", value: "06" },
    { name: "July", value: "07" }, { name: "August", value: "08" }, { name: "September", value: "09" },
    { name: "October", value: "10" }, { name: "November", value: "11" }, { name: "December", value: "12" },
  ];

  const filteredTransactions = allTransactions2
    .filter(t => t.amount < 0)
    .filter(t => !excludedCategories.includes(t.category))
    .filter(t => t.description.toLowerCase().includes(descriptionFilter.toLowerCase()))
    .filter(t => paymentSourceFilter === "" || t.payment_source === paymentSourceFilter)
    .filter(t => {
      const transactionDate = new Date(t.date);
      if (dateFilterType === "Year") {
        return selectedYear === "" || transactionDate.getFullYear().toString() === selectedYear;
      } else if (dateFilterType === "Month") {
        return (selectedYear === "" || transactionDate.getFullYear().toString() === selectedYear) &&
               (selectedMonth === "" || (transactionDate.getMonth() + 1).toString().padStart(2, '0') === selectedMonth);
      } else if (dateFilterType === "Custom") {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        return (!start || transactionDate >= start) && (!end || transactionDate <= end);
      } else { // "All"
        return transactionDate.getFullYear().toString() === selectedYearDashboard;
      }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log("App.js - filteredTransactions:", filteredTransactions);

  const getActiveProfileType = () => {
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    return activeProfile ? activeProfile.profile_type : null;
  };

  const activeProfileType = getActiveProfileType();

  return (
    <div className="container-fluid">
      <Row>
        <Col md={1} className="sidebar-col">
          <SideBar profiles={profiles} activeProfileId={activeProfileId} setActiveProfileId={setActiveProfileId} handleCreateProfile={handleCreateProfile} handleUpdateProfile={handleUpdateProfile} handleDeleteProfile={handleDeleteProfile} onProfileVisibilityChange={handleProfileVisibilityChange} />
        </Col>
        <Col md={11}>
          <h1 className="my-4">Expense Manager</h1>
          <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
            <Tab eventKey="home" title="Home">
              <HomePage onProfileSelect={handleProfileSelect} />
            </Tab>
            {activeProfileId && (
              <Tab eventKey="profileDashboard" title="Profile Dashboard">
                {activeProfileId ? (
                  <div>
                    <div className="row">
                      <div className="col-lg-12 mb-4">
                        <div className="card">
                          <div className="card-body">
                            <div className="d-flex justify-content-end">
                              <div className="col-md-3">
                                <label htmlFor="yearSelectDashboard" className="form-label">Select Year:</label>
                                <select
                                  id="yearSelectDashboard"
                                  className="form-control"
                                  value={selectedYearDashboard}
                                  onChange={e => setSelectedYearDashboard(e.target.value)}
                                >
                                  {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {activeProfileType === "EXPENSE_MANAGER" && (
                      <Tabs activeKey={dashboardSubTabKey} onSelect={(k) => setDashboardSubTabKey(k)} className="mb-3">
                      <Tab eventKey="overview" title="Overview">
                        <div className="row">
                          <div className="col-lg-4">
                            <div className="card summary-card income-card mb-3">
                              <div className="card-header">Total Income</div>
                              <div className="card-body">
                                <h5 className="card-title">{formatCurrency(totalIncome, settings.currency)}</h5>
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-4">
                            <div className="card summary-card expenses-card mb-3">
                              <div className="card-header">Total Expenses</div>
                              <div className="card-body">
                                <h5 className="card-title">{formatCurrency(totalExpenses, settings.currency)}</h5>
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-4">
                            <div className="card summary-card net-income-card mb-3">
                              <div className="card-header">Net Income</div>
                              <div className="card-body">
                                <h5 className="card-title">{formatCurrency(netIncome, settings.currency)}</h5>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-lg-6">
                            <div className="card mb-4 shadow-lg"> {/* Card for Pie Chart with shadow */}
                              <div className="card-header">
                                Expenses by Payment Source
                              </div>
                              <div className="card-body">
                                <PaymentSourcePieChart expenses={expenses} currency={settings.currency} />
                              </div>
                            </div>
                          </div>
                          <div className="col-lg-6">
                            {/* New Payment Source Specific Monthly Overview */}
                            <div className="card mb-4 shadow-lg"> {/* Card for Bar Chart with shadow */}
                              <div className="card-header">
                                Payment Source Specific Monthly Overview
                              </div>
                              <div className="card-body">
                                <div className="row mb-3">
                                  <div className="col-md-4">
                                    <select
                                      className="form-control"
                                      value={selectedPaymentSourceForChart}
                                      onChange={e => setSelectedPaymentSourceForChart(e.target.value)}
                                    >
                                      <option value="">All Payment Sources</option>
                                      {paymentSources.map(source => (
                                        <option key={source} value={source}>{source}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <PaymentSourceMonthlyBarChart
                                  income={income}
                                  expenses={expenses}
                                  selectedPaymentSource={selectedPaymentSourceForChart}
                                  currency={settings.currency}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-lg-12">
                            <div className="card mb-4 shadow-lg">
                              <div className="card-header">
                                Monthly Overview
                              </div>
                              <div className="card-body">
                                <div className="row mb-3">
                                  <div className="col-md-6">
                                    <select
                                      className="form-control"
                                      value={selectedPaymentSourceForMonthlyTable}
                                      onChange={e => setSelectedPaymentSourceForMonthlyTable(e.target.value)}
                                    >
                                      <option value="">All Payment Sources</option>
                                      {paymentSources.map(source => (
                                        <option key={source} value={source}>{source}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <MonthlySummaryTable
                                  income={income}
                                  expenses={expenses}
                                  selectedPaymentSource={selectedPaymentSourceForMonthlyTable}
                                  currency={settings.currency}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-lg-12">
                            <div className="card mb-4 shadow-lg" style={{ position: 'relative', zIndex: 0 }}>
                              <CategoryCostChart data={categoryCostData} budgets={settings.budgets} selectedYear={selectedYearDashboard} currency={settings.currency} />
                            </div>
                          </div>
                        </div>



                        <div className="row mt-4"> {/* Added margin-top for spacing */}
                          <div className="col-lg-12">
                            <div className="card mb-4 shadow-lg" style={{ position: 'relative', zIndex: 1 }}>
                              <MonthlyStackedBarChart data={monthlyCategoryExpenses} excludedCategories={excludedCategories} budgets={settings.budgets} currency={settings.currency} />
                            </div>
                          </div>
                        </div>
                      </Tab>
                      <Tab eventKey="subcategoryTrends" title="Subcategory Trends">
                        <div className="row mt-4"> {/* Added margin-top for spacing */}
                                            <div className="col-lg-12">
                                              <CategorySubcategoryMonthlyCharts data={monthlyCategoryExpenses} excludedCategories={excludedCategories} budgets={settings.budgets} selectedYear={selectedYearDashboard} currency={settings.currency} activeProfileId={activeProfileId} />
                                            </div>              </div>
                      </Tab>
                      <Tab eventKey="transactionDetails" title="Transaction Details">
                        <div className="card">
                          <div className="card-header">
                            Transaction Details
                          </div>
                          <div className="card-body">
                            <div className="row mb-3">
                              <div className="col">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Filter by description..."
                                  value={descriptionFilter}
                                  onChange={e => setDescriptionFilter(e.target.value)}
                                />
                              </div>
                              <div className="col">
                                <select
                                  className="form-control"
                                  value={paymentSourceFilter}
                                  onChange={e => setPaymentSourceFilter(e.target.value)}
                                >
                                  <option value="">All Payment Sources</option>
                                  {paymentSources.map(source => (
                                    <option key={source} value={source}>{source}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {/* New Date Filtering Controls */}
                            <div className="row mb-3">
                              <div className="col-md-3">
                                <select
                                  className="form-control"
                                  value={dateFilterType}
                                  onChange={e => {
                                    setDateFilterType(e.target.value);
                                    setSelectedMonth("");
                                    setSelectedYear("");
                                    setStartDate("");
                                    setEndDate("");
                                  }}
                                >
                                  <option value="All">All Dates</option>
                                  <option value="Year">By Year</option>
                                  <option value="Month">By Month</option>
                                  <option value="Custom">Custom Range</option>
                                </select>
                              </div>
                              {dateFilterType === "Year" && (
                                <div className="col-md-3">
                                  <select
                                    className="form-control"
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(e.target.value)}
                                  >
                                    <option value="">Select Year</option>
                                    {years.map(year => (
                                      <option key={year} value={year}>{year}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {dateFilterType === "Month" && (
                                <>
                                  <div className="col-md-3">
                                    <select
                                      className="form-control"
                                      value={selectedYear}
                                      onChange={e => setSelectedYear(e.target.value)}
                                    >
                                      <option value="">Select Year</option>
                                      {years.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-md-3">
                                    <select
                                      className="form-control"
                                      value={selectedMonth}
                                      onChange={e => setSelectedMonth(e.target.value)}
                                    >
                                      <option value="">Select Month</option>
                                      {months.map(month => (
                                        <option key={month.value} value={month.value}>{month.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </>
                              )}
                              {dateFilterType === "Custom" && (
                                <>
                                  <div className="col-md-3">
                                    <input
                                      type="date"
                                      className="form-control"
                                      value={startDate}
                                      onChange={e => setStartDate(e.target.value)}
                                    />
                                  </div>
                                  <div className="col-md-3">
                                    <input
                                      type="date"
                                      className="form-control"
                                      value={endDate}
                                      onChange={e => setEndDate(e.target.value)}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            <ExpenseTable expenses={filteredTransactions} categories={settings.categories} onUpdateTransactionCategory={handleUpdateTransactionCategory} onAddRuleFromTransaction={handleAddRuleFromTransaction} currency={settings.currency} onDeleteTransaction={handleDeleteTransaction} />
                          </div>
                        </div>
                      </Tab>
                      <Tab eventKey="budget" title="Budget">
                        <BudgetVisualization settings={settings} categories={settings.categories} selectedYear={selectedYearDashboard} currency={settings.currency} activeProfileId={activeProfileId} />
                      </Tab>
                    </Tabs>
                    )}
                    {activeProfileType === "ASSET_MANAGER" && (
                      <AssetDashboard
                        assets={assets}
                        assetTypes={assetTypes}
                        currency={settings.currency}
                        activeProfileId={activeProfileId}
                        selectedYear={selectedYearDashboard}
                    />
                    )}
                  </div>
                ) : (
                  <div className="mt-3">
                    <Alert variant="info">Please select a profile from the Home page to view its dashboard.</Alert>
                  </div>
                )}
              </Tab>
            )}
            {activeProfileId && activeProfileType === "EXPENSE_MANAGER" && (
              <Tab eventKey="manualEntry" title="Record Transaction">
                <ManualTransactionEntry
                  profileId={activeProfileId}
                  categories={settings.categories}
                  paymentSources={paymentSources}
                  onTransactionAdded={fetchData}
                />
              </Tab>
            )}
            {activeProfileId && activeProfileType === "ASSET_MANAGER" && (
              <Tab eventKey="recordAsset" title="Record Asset">
                <RecordAsset
                    profileId={activeProfileId}
                    assetTypes={assetTypes}
                    onAssetAdded={fetchData}
                />
              </Tab>
            )}
            {activeProfileId && activeProfileType === "EXPENSE_MANAGER" && (
              <Tab eventKey="rules" title="Rules">
                <RulesTab settings={settings} onSave={handleSaveSettings} categories={settings.categories} paymentSources={paymentSources} />
              </Tab>
            )}
            {activeProfileId && (
              <Tab eventKey="settings" title="Settings">
                {activeProfileType === "EXPENSE_MANAGER" ? (
                    <Settings settings={settings} onSave={handleSaveSettings} profileId={activeProfileId} />
                ) : (
                    <AssetTypeManager profileId={activeProfileId} />
                )}
              </Tab>
            )}
          </Tabs>
        </Col>
      </Row>
    </div>
  );
}

export default App;
