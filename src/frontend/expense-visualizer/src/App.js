import React, { useState, useEffect } from 'react';
import { Link, BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import authService from './utils/authService';
import Login from './components/Login';
import Signup from './components/Signup';
import ExpenseTable from './ExpenseTable';
import PaymentSourcePieChart from './PaymentSourcePieChart';
import MonthlySummaryTable from './MonthlySummaryTable';
import PaymentSourceMonthlyBarChart from './PaymentSourceMonthlyBarChart';
import CategoryCostChart from './CategoryCostChart';
import MonthlyStackedBarChart from './MonthlyStackedBarChart';
import CategorySubcategoryMonthlyCharts from './CategorySubcategoryMonthlyCharts';
import BudgetVisualization from './BudgetVisualization';
import 'bootstrap/dist/css/bootstrap.min.css';
import Settings from './Settings';
import RulesTab from './RulesTab';
import ManualTransactionEntry from './ManualTransactionEntry';
import HomePage from './HomePage';
import { Tab, Tabs, Row, Col, Alert, Button, Card } from 'react-bootstrap';
import { LockFill, PlusCircle } from 'react-bootstrap-icons';
import { formatCurrency } from './utils/currency';
import SideBar from './components/SideBar';
import AssetDashboard from './components/AssetDashboard';
import RecordAsset from "./RecordAsset";
import AssetTypeManager from "./components/AssetTypeManager";
import MembershipBanner from './components/MembershipBanner';
import SubscriptionModal from './components/SubscriptionModal';
import AdminPanel from './components/AdminPanel';

const ActivityType = {
    TAB_HOME_CLICKED: "TAB_HOME_CLICKED",
    TAB_PROFILE_DASHBOARD_CLICKED: "TAB_PROFILE_DASHBOARD_CLICKED",
    TAB_RECORD_TRANSACTION_CLICKED: "TAB_RECORD_TRANSACTION_CLICKED",
    TAB_RECORD_ASSET_CLICKED: "TAB_RECORD_ASSET_CLICKED",
    TAB_RULES_CLICKED: "TAB_RULES_CLICKED",
    TAB_SETTINGS_CLICKED: "TAB_SETTINGS_CLICKED",
    SUBTAB_OVERVIEW_CLICKED: "SUBTAB_OVERVIEW_CLICKED",
    SUBTAB_SUBCATEGORY_TRENDS_CLICKED: "SUBTAB_SUBCATEGORY_TRENDS_CLICKED",
    SUBTAB_TRANSACTION_DETAILS_CLICKED: "SUBTAB_TRANSACTION_DETAILS_CLICKED",
    SUBTAB_BUDGET_CLICKED: "SUBTAB_BUDGET_CLICKED",
};

// Setup axios interceptor
axios.interceptors.request.use(config => {
    const user = authService.getCurrentUser();
    if (user && user.access_token) {
        config.headers.Authorization = `Bearer ${user.access_token}`;
    }
    return config;
});

axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            authService.logout();
            window.location.href = '/login'; // Redirect to login page
        }
        return Promise.reject(error);
    }
);

const PrivateRoute = ({ children }) => {
    const user = authService.getCurrentUser();
    return user ? children : <Navigate to="/login" />;
};

function MainApp({ currentUser, onSubscribe }) {
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
    const [profileTypeLoaded, setProfileTypeLoaded] = useState(false); // New state for profile type loaded status
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [showCreateProfileModalFromHome, setShowCreateProfileModalFromHome] = useState(false); // New state for modal from HomePage
    const navigate = useNavigate();

    const API_BASE_URL = 'http://localhost:8000';

    const logActivity = async (activityType, details = {}, profileId = null) => {
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

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const fetchData = async () => {
        console.log('fetchData called. activeProfileId:', activeProfileId);
        if (activeProfileId) {
            localStorage.setItem('activeProfileId', activeProfileId);
            try {
                const profileResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}`);
                const activeProfileType = profileResponse.data.profile_type;
                console.log('Profile type fetched:', activeProfileType);

                if (activeProfileType === "EXPENSE_MANAGER") {
                    const response = await axios.get(`${API_BASE_URL}/api/expenses?profile_id=${activeProfileId}`, { params: { excluded_categories: excludedCategories } });
                    const allTransactionsWithId = [...response.data.income, ...response.data.expenses].map((t, index) => ({
                        ...t,
                        id: t.id || `${t.date}-${t.description}-${t.amount}-${t.payment_source}-${index}`
                    }));
                    setAllTransactions(allTransactionsWithId);
                    setSettings(response.data.settings);

                    const paymentSourcesResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/payment_sources`);
                    setPaymentSources(paymentSourcesResponse.data.map(ps => ps.source_name));
                } else if (activeProfileType === "ASSET_MANAGER") {
                    const assetTypesResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/asset_types`);
                    setAssetTypes(assetTypesResponse.data);

                    const assetsResponse = await axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/assets`);
                    setAssets(assetsResponse.data);
                    setSettings(prevSettings => ({ ...prevSettings, currency: profileResponse.data.currency }));
                }
                setProfileTypeLoaded(true); // Set to true after data is fetched
                console.log('profileTypeLoaded set to true (data fetched).');
            } catch (error) {
                console.error('Error fetching data: ', error);
                setProfileTypeLoaded(true); // Set to true even on error to avoid infinite loading
                console.log('profileTypeLoaded set to true (error during fetch).');
            }
        } else {
            setProfileTypeLoaded(true); // Set to true if no activeProfileId
            console.log('profileTypeLoaded set to true (no activeProfileId).');
        }
    };

    useEffect(() => {
        axios.get('http://localhost:8000/api/profiles')
            .then(response => {
                const fetchedProfiles = response.data;
                setProfiles(fetchedProfiles);

                const storedActiveProfileId = localStorage.getItem('activeProfileId');
                let newActiveProfileId = null;

                if (storedActiveProfileId) {
                    // Check if the stored activeProfileId belongs to the current user's profiles
                    const foundProfile = fetchedProfiles.find(p => p.id === parseInt(storedActiveProfileId));
                    if (foundProfile) {
                        newActiveProfileId = foundProfile.id;
                    }
                }

                // If no valid activeProfileId is found, default to the first available profile
                if (!newActiveProfileId && fetchedProfiles.length > 0) {
                    newActiveProfileId = fetchedProfiles[0].id;
                }
                
                setActiveProfileId(newActiveProfileId);
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
                  } else {
                    setMonthlyAggregatedExpenses([]);
                    setMonthlyCategoryExpenses([]);
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
            axios.get(`${API_BASE_URL}/api/profiles/${activeProfileId}/assets/summary?year=${selectedYearDashboard}`)
              .then(response => {
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

    const handleProfileVisibilityChange = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/profiles');
      setProfiles(response.data);

      const updatedActiveProfile = response.data.find(p => p.id === activeProfileId);
      if (updatedActiveProfile && updatedActiveProfile.is_hidden) {
        setActiveProfileId(null);
        setKey('home');
      }
    } catch (error) {
      console.error('Error re-fetching profiles after visibility change:', error);
    }
  };

  const handleSubscribe = (period) => {
    onSubscribe(period).then(() => {
        setShowSubscribeModal(false);
    });
  };

    const activeProfileType = profiles.find(p => p.id === activeProfileId)?.profile_type;
    console.log('Derived activeProfileType for rendering:', activeProfileType, 'Profiles:', profiles, 'Active Profile ID:', activeProfileId);
    const filteredIncomeForTotal = income.filter(inc => !excludedCategories.includes(inc.category));
    const totalIncome = filteredIncomeForTotal.reduce((acc, item) => acc + item.amount, 0);
    const filteredExpensesForTotal = expenses.filter(exp => !excludedCategories.includes(exp.category));
    const totalExpenses = filteredExpensesForTotal.reduce((acc, item) => acc + item.amount, 0);
    const netIncome = totalIncome + totalExpenses;
    const years = [...new Set(allTransactions.map(t => new Date(t.date).getFullYear().toString()))].sort((a, b) => b - a);
    const months = [
        { name: "January", value: "01" }, { name: "February", value: "02" }, { name: "March", "value": "03" },
        { name: "April", value: "04" }, { name: "May", value: "05" }, { name: "June", value: "06" },
        { name: "July", value: "07" }, { name: "August", value: "08" }, { name: "September", value: "09" },
        { name: "October", value: "10" }, { name: "November", value: "11" }, { name: "December", value: "12" },
    ];

    const filteredTransactions = allTransactions
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

    const handleProfileSelect = (profileId) => {
        setActiveProfileId(profileId);
        setKey('profileDashboard'); // Switch to the profile dashboard tab
    };

    const handleTabSelect = (k) => {
        setKey(k);
        let activityType;
        switch (k) {
            case 'home':
                activityType = ActivityType.TAB_HOME_CLICKED;
                break;
            case 'profileDashboard':
                activityType = ActivityType.TAB_PROFILE_DASHBOARD_CLICKED;
                break;
            case 'manualEntry':
                activityType = ActivityType.TAB_RECORD_TRANSACTION_CLICKED;
                break;
            case 'recordAsset':
                activityType = ActivityType.TAB_RECORD_ASSET_CLICKED;
                break;
            case 'rules':
                activityType = ActivityType.TAB_RULES_CLICKED;
                break;
            case 'settings':
                activityType = ActivityType.TAB_SETTINGS_CLICKED;
                break;
            default:
                activityType = ActivityType.TAB_CLICKED; // Fallback
        }
        logActivity(activityType, {}, activeProfileId);
    };

    return (
        <div className="container-fluid">
            <Row>
                <Col md={1} className="sidebar-col">
                    <SideBar profiles={profiles} activeProfileId={activeProfileId} setActiveProfileId={setActiveProfileId} handleCreateProfile={handleCreateProfile} handleUpdateProfile={handleUpdateProfile} handleDeleteProfile={handleDeleteProfile} onProfileVisibilityChange={handleProfileVisibilityChange} showCreateProfileModalFromHome={showCreateProfileModalFromHome} setShowCreateProfileModalFromHome={setShowCreateProfileModalFromHome} />
                </Col>
                <Col md={11}>
                    <div className="d-flex justify-content-between align-items-center">
                        <h1 className="my-4">Expense Manager</h1>
                        <div>
                            {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') && (
                                <Link to="/admin" className="btn btn-secondary me-2">Admin Panel</Link>
                            )}
                            <Button variant="outline-danger" onClick={handleLogout}>Logout</Button>
                        </div>
                    </div>
                    {currentUser && !currentUser.is_premium && (
                        <MembershipBanner onUpgradeClick={() => setShowSubscribeModal(true)} />
                    )}
                    <Tabs activeKey={key} onSelect={handleTabSelect} className="mb-3">
                        <Tab eventKey="home" title="Home">
                            <HomePage onProfileSelect={handleProfileSelect} setShowCreateProfileModalFromHome={setShowCreateProfileModalFromHome} currentUser={currentUser} />
                        </Tab>

                        {currentUser?.is_premium ? (
                            activeProfileId && profileTypeLoaded && (
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
                                                <Tabs activeKey={dashboardSubTabKey} onSelect={(k) => {
                                                    setDashboardSubTabKey(k);
                                                    let subTabActivityType;
                                                    switch (k) {
                                                        case 'overview':
                                                            subTabActivityType = ActivityType.SUBTAB_OVERVIEW_CLICKED;
                                                            break;
                                                        case 'subcategoryTrends':
                                                            subTabActivityType = ActivityType.SUBTAB_SUBCATEGORY_TRENDS_CLICKED;
                                                            break;
                                                        case 'transactionDetails':
                                                            subTabActivityType = ActivityType.SUBTAB_TRANSACTION_DETAILS_CLICKED;
                                                            break;
                                                        case 'budget':
                                                            subTabActivityType = ActivityType.SUBTAB_BUDGET_CLICKED;
                                                            break;
                                                        default:
                                                            subTabActivityType = ActivityType.TAB_CLICKED; // Fallback
                                                    }
                                                    logActivity(subTabActivityType, {}, activeProfileId);
                                                }} className="mb-3">
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
                                                                <div className="card mb-4 shadow-lg">
                                                                    <div className="card-header">
                                                                        Expenses by Payment Source
                                                                    </div>
                                                                    <div className="card-body">
                                                                        <PaymentSourcePieChart expenses={expenses} currency={settings.currency} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="col-lg-6">
                                                                <div className="card mb-4 shadow-lg">
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

                                                        <div className="row mt-4">
                                                            <div className="col-lg-12">
                                                                <div className="card mb-4 shadow-lg" style={{ position: 'relative', zIndex: 1 }}>
                                                                    <MonthlyStackedBarChart data={monthlyCategoryExpenses} excludedCategories={excludedCategories} budgets={settings.budgets} currency={settings.currency} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Tab>
                                                    <Tab eventKey="subcategoryTrends" title="Subcategory Trends">
                                                        <div className="row mt-4">
                                                            <div className="col-lg-12">
                                                                <CategorySubcategoryMonthlyCharts data={monthlyCategoryExpenses} excludedCategories={excludedCategories} budgets={settings.budgets} selectedYear={selectedYearDashboard} currency={settings.currency} activeProfileId={activeProfileId} />
                                                            </div>
                                                        </div>
                                                    </Tab>
                                                    <Tab eventKey="transactionDetails" title="Transaction Details">
                                                        <ExpenseTable expenses={filteredTransactions} categories={settings.categories} onUpdateTransactionCategory={handleUpdateTransactionCategory} onAddRuleFromTransaction={handleAddRuleFromTransaction} currency={settings.currency} onDeleteTransaction={handleDeleteTransaction} />
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
                                        <Card className="shadow-lg p-4 text-center mt-3">
                                            <Card.Body>
                                                <h2 className="text-primary mb-3">No Profile Selected</h2>
                                                <p className="lead mb-4">
                                                    Please select an existing profile from the sidebar or create a new one to view its dashboard.
                                                </p>
                                                <Button variant="primary" onClick={() => setShowCreateProfileModalFromHome(true)}>
                                                    <PlusCircle className="me-2" />Create New Profile
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    )}
                                </Tab>
                            )
                        ) : (
                            <Tab eventKey="profileDashboard" title={<span>Profile Dashboard <LockFill/></span>} disabled />
                        )}

                        {currentUser?.is_premium ? (
                            activeProfileId && profileTypeLoaded && activeProfileType === "EXPENSE_MANAGER" && (
                                <Tab eventKey="manualEntry" title="Record Transaction">
                                    <ManualTransactionEntry
                                        profileId={activeProfileId}
                                        paymentSources={paymentSources}
                                        onTransactionAdded={fetchData}
                                    />
                                </Tab>
                            )
                        ) : (
                            activeProfileId && profileTypeLoaded && activeProfileType === "EXPENSE_MANAGER" && (
                                <Tab eventKey="manualEntry" title={<span>Record Transaction <LockFill/></span>} disabled />
                            )
                        )}

                        {currentUser?.is_premium ? (
                            activeProfileId && profileTypeLoaded && activeProfileType === "ASSET_MANAGER" && (
                                <Tab eventKey="recordAsset" title="Record Asset">
                                    <RecordAsset
                                        profileId={activeProfileId}
                                        assetTypes={assetTypes}
                                        onAssetAdded={fetchData}
                                    />
                                </Tab>
                            )
                        ) : (
                            activeProfileId && profileTypeLoaded && activeProfileType === "ASSET_MANAGER" && (
                                <Tab eventKey="recordAsset" title={<span>Record Asset <LockFill/></span>} disabled />
                            )
                        )}

                        {currentUser?.is_premium ? (
                             activeProfileId && profileTypeLoaded && activeProfileType === "EXPENSE_MANAGER" && (
                                <Tab eventKey="rules" title="Rules">
                                    <RulesTab settings={settings} onSave={handleSaveSettings} categories={settings.categories} paymentSources={paymentSources} />
                                </Tab>
                            )
                        ) : (
                            activeProfileId && profileTypeLoaded && activeProfileType === "EXPENSE_MANAGER" && (
                                <Tab eventKey="rules" title={<span>Rules <LockFill/></span>} disabled />
                            )
                        )}

                        {currentUser?.is_premium ? (
                            activeProfileId && profileTypeLoaded && (
                                <Tab eventKey="settings" title="Settings">
                                    {activeProfileType === "EXPENSE_MANAGER" ? (
                                        <Settings settings={settings} onSave={handleSaveSettings} profileId={activeProfileId} />
                                    ) : (
                                        <AssetTypeManager profileId={activeProfileId} />
                                    )}
                                </Tab>
                            )
                        ) : (
                             activeProfileId && profileTypeLoaded && (
                                <Tab eventKey="settings" title={<span>Settings <LockFill/></span>} disabled />
                            )
                        )}
                    </Tabs>
                    <SubscriptionModal
                        show={showSubscribeModal}
                        onHide={() => setShowSubscribeModal(false)}
                        onSubscribe={onSubscribe}
                    />
                </Col>
            </Row>
        </div>
    );
}


function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const API_BASE_URL = 'http://localhost:8000';

    const fetchUser = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/me`);
            setCurrentUser(response.data);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    useEffect(() => {
        if (authService.getCurrentUser()) {
            fetchUser();
        }
    }, []);

    const handleSubscribe = async (period) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/users/me/subscribe`, { period });
            setCurrentUser(response.data);
            alert('Subscription successful! You are now a Premium user.');
        } catch (error) {
            console.error('Error subscribing:', error);
            alert('Subscription failed. Please try again.');
        }
    };

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login onLogin={fetchUser} />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/admin/*" element={<PrivateRoute><AdminPanel currentUser={currentUser} /></PrivateRoute>} />
                <Route path="/*" element={<PrivateRoute><MainApp currentUser={currentUser} onSubscribe={handleSubscribe} /></PrivateRoute>} />
            </Routes>
        </Router>
    );
}

export default App;
