'use client'
import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Import Chart.js untuk grafik
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
// Storage helpers
const StorageManager = {
  get: (key) => {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error(`Error getting item from localStorage:`, error);
        return null;
      }
    }
    return null;
  },
  set: (key, value) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error setting item to localStorage:`, error);
      }
    }
  },
  remove: (key) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing item from localStorage:`, error);
      }
    }
  },
  exportData: () => {
    if (typeof window !== 'undefined') {
      try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('kasir_')) {
            const item = localStorage.getItem(key);
            if (item) {
              data[key] = JSON.parse(item);
            }
          }
        }
        return data;
      } catch (error) {
        console.error(`Error exporting data from localStorage:`, error);
        return {};
      }
    }
    return {};
  },
  importData: (data) => {
    if (typeof window !== 'undefined') {
      try {
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });
      } catch (error) {
        console.error(`Error importing data to localStorage:`, error);
      }
    }
  },
  resetData: () => {
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('kasir_')) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error(`Error resetting data from localStorage:`, error);
      }
    }
  }
};
// Utility functions
const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Rp 0';
  }
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    console.error(`Error formatting currency:`, error);
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }
};
// Format currency untuk input field
const formatCurrencyInput = (value) => {
  // Pastikan value adalah string
  if (typeof value !== 'string') {
    value = String(value || '');
  }
  
  // Hapus karakter non-digit kecuali koma
  let numericValue = value.replace(/[^\d]/g, '');
  
  // Konversi ke number
  const numberValue = parseInt(numericValue, 10) || 0;
  
  // Format dengan titik sebagai pemisah ribuan
  return numberValue.toLocaleString('id-ID');
};
// Parse formatted currency back to number
const parseCurrencyInput = (formattedValue) => {
  // Pastikan formattedValue adalah string
  if (typeof formattedValue !== 'string') {
    return 0;
  }
  
  // Hapus titik dan konversi ke number
  return parseInt(formattedValue.replace(/\./g, ''), 10) || 0;
};
const formatDate = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('id-ID');
  } catch (error) {
    console.error(`Error formatting date:`, error);
    return String(date);
  }
};
const formatDateTime = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString('id-ID');
  } catch (error) {
    console.error(`Error formatting date time:`, error);
    return String(date);
  }
};
export default function KasirApp() {
  // State for active tab
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State for storage location
  const [storageLocation, setStorageLocation] = useState('localStorage');
  
  // State for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for Kasir
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerMoney, setCustomerMoney] = useState(0);
  
  // State for editing product
  const [editingProduct, setEditingProduct] = useState(null);
  
  // State for new product image
  const [newProductImage, setNewProductImage] = useState(null);
  const newProductImageRef = useRef(null);
  
  // State for Founder Share Calculator
  const [founderData, setFounderData] = useState([
    { id: 1, name: 'Founder A', percentage: 50 },
    { id: 2, name: 'Founder B', percentage: 50 }
  ]);
  
  // State for editing founder
  const [editingFounder, setEditingFounder] = useState(null);
  
  // State for Electricity Management
  const [electricityData, setElectricityData] = useState({
    vouchers: [],
    devices: [],
    maxPower: 900, // Default 900W
    lastTopUp: null,
    lastTopUpAmount: 0
  });
  
  // State for HR & Salary
  const [employees, setEmployees] = useState([]);
  const [employeeWorkHistory, setEmployeeWorkHistory] = useState([]);
  
  // State for editing employee
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  // State for Expenses with expanded categories
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([
    // Biaya Pokok Penjualan (HPP)
    'Daging Babi Hutan',
    'Daging Babi Ternak',
    'Bumbu',
    'Packaging',
    'Plastik Vacuum',
    'Es Batu',
    'Styrofoam',
    
    // Biaya Operasional
    'Sewa Tempat',
    'Listrik',
    'Air',
    'Telepon & Internet',
    'Perlengkapan Kantor',
    'Perawatan',
    
    // Biaya Tenaga Kerja
    'Gaji Karyawan',
    'Bonus & Insentif',
    'BPJS Kesehatan',
    'BPJS Ketenagakerjaan',
    
    // Biaya Pemasaran
    'Iklan Online',
    'Promosi',
    'Event',
    'Material Promosi',
    
    // Biaya Akomodasi & Pengiriman
    'Pengiriman Supplier',
    'Pengiriman Customer',
    'Transportasi',
    
    // Biaya Administrasi & Umum
    'Administrasi Bank',
    'Pajak',
    'Asuransi',
    'Perizinan',
    
    // Aset & Depresiasi
    'Peralatan Masak',
    'Peralatan Kantor',
    'Kendaraan',
    'Furnitur',
    
    // Lainnya
    'Lainnya'
  ]);
  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });
  
  // State for accommodation costs
  const [accommodationCosts, setAccommodationCosts] = useState([]);
  const [newAccommodation, setNewAccommodation] = useState({
    type: 'supplier_to_kitchen', // or 'kitchen_to_customer'
    date: new Date().toISOString().split('T')[0],
    description: '',
    distance: 0,
    cost: 0,
    vehicle: ''
  });
  
  // State for assets and depreciation
  const [assets, setAssets] = useState([]);
  const [assetCategories, setAssetCategories] = useState([
    'Peralatan Masak',
    'Peralatan Kantor',
    'Kendaraan',
    'Furnitur',
    'Peralatan Elektronik',
    'Mesin Produksi',
    'Bangunan',
    'Tanah',
    'Lainnya'
  ]);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'Peralatan Masak',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    usefulLife: 5, // years
    salvageValue: 0,
    depreciationMethod: 'straight_line' // or 'reducing_balance'
  });
  
  // State for chart type
  const [chartType, setChartType] = useState('daily');
  
  // State for product cost (HPP)
  const [productCosts, setProductCosts] = useState({});
  
  // State for product details (for comprehensive product management)
  const [productDetails, setProductDetails] = useState({});
  
  // State for suppliers
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact: '',
    address: '',
    email: '',
    phone: ''
  });
  
  // State for stock opname
  const [stockOpname, setStockOpname] = useState([]);
  const [newStockOpname, setNewStockOpname] = useState({
    date: new Date().toISOString().split('T')[0],
    notes: '',
    items: []
  });
  
  // State for data loaded
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // State for category management
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [categoryType, setCategoryType] = useState('expense'); // 'expense' or 'asset'
  const [newCategory, setNewCategory] = useState('');
  
  // State for salary increase simulation
  const [showSalaryIncreaseModal, setShowSalaryIncreaseModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newSalary, setNewSalary] = useState(0);
  const [salaryImpact, setSalaryImpact] = useState(null);
  
  // State for work history
  const [showWorkHistoryModal, setShowWorkHistoryModal] = useState(false);
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState([]);
  const [newWorkRecord, setNewWorkRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    hourlyRate: 0,
    description: ''
  });
  
  // State for profit distribution
  const [profitDistribution, setProfitDistribution] = useState({
    businessPercentage: 70, // 70% untuk usaha
    founderPercentage: 30, // 30% untuk founder
    businessSavingsPercentage: 30, // 30% dari bagian usaha untuk simpanan
    businessOperationalPercentage: 70 // 70% dari bagian usaha untuk operasional
  });
  
  // State for financial records
  const [financialRecords, setFinancialRecords] = useState([]);
  
  // State for debts and receivables
  const [debts, setDebts] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [newDebt, setNewDebt] = useState({
    name: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    description: '',
    status: 'unpaid'
  });
  const [newReceivable, setNewReceivable] = useState({
    name: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    description: '',
    status: 'unpaid'
  });
  
  // Ref for charts
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const salesChartRef = useRef(null);
  const salesChartInstance = useRef(null);
  const profitChartRef = useRef(null);
  const profitChartInstance = useRef(null);
  const stockChartRef = useRef(null);
  const stockChartInstance = useRef(null);
  
  // Initialize data from localStorage
  useEffect(() => {
    // This effect runs only on the client side
    const loadData = () => {
      try {
        // Load products
        const savedProducts = StorageManager.get('kasir_products');
        if (savedProducts) setProducts(savedProducts);
        
        // Load founder data
        const savedFounderData = StorageManager.get('kasir_founder');
        if (savedFounderData) setFounderData(savedFounderData);
        
        // Load electricity data
        const savedElectricityData = StorageManager.get('kasir_electricity');
        if (savedElectricityData) setElectricityData(savedElectricityData);
        
        // Load employees
        const savedEmployees = StorageManager.get('kasir_employees');
        if (savedEmployees) setEmployees(savedEmployees);
        
        // Load employee work history
        const savedWorkHistory = StorageManager.get('kasir_work_history');
        if (savedWorkHistory) setEmployeeWorkHistory(savedWorkHistory);
        
        // Load expenses
        const savedExpenses = StorageManager.get('kasir_expenses');
        if (savedExpenses) setExpenses(savedExpenses);
        
        // Load expense categories
        const savedExpenseCategories = StorageManager.get('kasir_expense_categories');
        if (savedExpenseCategories) setExpenseCategories(savedExpenseCategories);
        
        // Load accommodation costs
        const savedAccommodationCosts = StorageManager.get('kasir_accommodation');
        if (savedAccommodationCosts) setAccommodationCosts(savedAccommodationCosts);
        
        // Load assets
        const savedAssets = StorageManager.get('kasir_assets');
        if (savedAssets) setAssets(savedAssets);
        
        // Load asset categories
        const savedAssetCategories = StorageManager.get('kasir_asset_categories');
        if (savedAssetCategories) setAssetCategories(savedAssetCategories);
        
        // Load product costs
        const savedProductCosts = StorageManager.get('kasir_product_costs');
        if (savedProductCosts) setProductCosts(savedProductCosts);
        
        // Load product details
        const savedProductDetails = StorageManager.get('kasir_product_details');
        if (savedProductDetails) setProductDetails(savedProductDetails);
        
        // Load suppliers
        const savedSuppliers = StorageManager.get('kasir_suppliers');
        if (savedSuppliers) setSuppliers(savedSuppliers);
        
        // Load stock opname
        const savedStockOpname = StorageManager.get('kasir_stock_opname');
        if (savedStockOpname) setStockOpname(savedStockOpname);
        
        // Load profit distribution
        const savedProfitDistribution = StorageManager.get('kasir_profit_distribution');
        if (savedProfitDistribution) setProfitDistribution(savedProfitDistribution);
        
        // Load financial records
        const savedFinancialRecords = StorageManager.get('kasir_financial_records');
        if (savedFinancialRecords) setFinancialRecords(savedFinancialRecords);
        
        // Load debts
        const savedDebts = StorageManager.get('kasir_debts');
        if (savedDebts) setDebts(savedDebts);
        
        // Load receivables
        const savedReceivables = StorageManager.get('kasir_receivables');
        if (savedReceivables) setReceivables(savedReceivables);
        
        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
        setDataLoaded(true);
      }
    };
    
    loadData();
  }, []);
  
  // Save data to localStorage when it changes
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_products', products);
    }
  }, [products, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_founder', founderData);
    }
  }, [founderData, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_electricity', electricityData);
    }
  }, [electricityData, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_employees', employees);
    }
  }, [employees, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_work_history', employeeWorkHistory);
    }
  }, [employeeWorkHistory, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_expenses', expenses);
    }
  }, [expenses, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_expense_categories', expenseCategories);
    }
  }, [expenseCategories, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_accommodation', accommodationCosts);
    }
  }, [accommodationCosts, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_assets', assets);
    }
  }, [assets, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_asset_categories', assetCategories);
    }
  }, [assetCategories, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_product_costs', productCosts);
    }
  }, [productCosts, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_product_details', productDetails);
    }
  }, [productDetails, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_suppliers', suppliers);
    }
  }, [suppliers, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_stock_opname', stockOpname);
    }
  }, [stockOpname, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_profit_distribution', profitDistribution);
    }
  }, [profitDistribution, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_financial_records', financialRecords);
    }
  }, [financialRecords, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_debts', debts);
    }
  }, [debts, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      StorageManager.set('kasir_receivables', receivables);
    }
  }, [receivables, dataLoaded]);
  
  // Initialize charts when tab changes
  useEffect(() => {
    if (activeTab === 'dashboard' && dataLoaded) {
      renderDashboardCharts();
    } else if (activeTab === 'laporan' && chartRef.current && dataLoaded) {
      renderChart();
    }
    
    // Cleanup charts on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      if (salesChartInstance.current) {
        salesChartInstance.current.destroy();
      }
      if (profitChartInstance.current) {
        profitChartInstance.current.destroy();
      }
      if (stockChartInstance.current) {
        stockChartInstance.current.destroy();
      }
    };
  }, [activeTab, chartType, dataLoaded]);
  
  // Render dashboard charts
  const renderDashboardCharts = () => {
    if (!dataLoaded) return;
    
    // Destroy existing charts
    if (salesChartInstance.current) {
      salesChartInstance.current.destroy();
    }
    if (profitChartInstance.current) {
      profitChartInstance.current.destroy();
    }
    if (stockChartInstance.current) {
      stockChartInstance.current.destroy();
    }
    
    const transactions = StorageManager.get('kasir_transactions') || [];
    
    // Sales chart (last 7 days)
    if (salesChartRef.current) {
      const salesCtx = salesChartRef.current.getContext('2d');
      const last7Days = [];
      const salesData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        
        const dayTransactions = transactions.filter(t => t.date && t.date.split('T')[0] === dateStr);
        const daySales = dayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
        salesData.push(daySales);
      }
      
      salesChartInstance.current = new Chart(salesCtx, {
        type: 'line',
        data: {
          labels: last7Days,
          datasets: [
            {
              label: 'Penjualan Harian',
              data: salesData,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Tren Penjualan 7 Hari Terakhir',
              font: {
                size: 14
              }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'Rp' + value.toLocaleString('id-ID');
                }
              }
            }
          }
        }
      });
    }
    
    // Profit chart (last 7 days)
    if (profitChartRef.current) {
      const profitCtx = profitChartRef.current.getContext('2d');
      const last7Days = [];
      const profitData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        
        const dayTransactions = transactions.filter(t => t.date && t.date.split('T')[0] === dateStr);
        const daySales = dayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
        
        // Calculate profit for the day
        let dayCost = 0;
        dayTransactions.forEach(t => {
          if (t.items) {
            t.items.forEach(item => {
              const productCost = productCosts[item.id] || 0;
              dayCost += productCost * (item.quantity || 0);
            });
          }
        });
        
        // Get expenses for the day
        const dayExpenses = expenses.filter(e => e.date === dateStr)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Get accommodation costs for the day
        const dayAccommodation = accommodationCosts.filter(a => a.date === dateStr)
          .reduce((sum, a) => sum + (a.cost || 0), 0);
        
        // Get depreciation for the day
        const dayDepreciation = calculateDailyDepreciation(dateStr);
        
        // Get salary expenses for the day
        const daySalaries = calculateDailySalaries(dateStr);
        
        // Get debt payments for the day
        const dayDebtPayments = debts.filter(d => d.date === dateStr && d.status === 'paid')
          .reduce((sum, d) => sum + (d.amount || 0), 0);
        
        // Get receivable collections for the day
        const dayReceivableCollections = receivables.filter(r => r.date === dateStr && r.status === 'paid')
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const dayProfit = daySales - dayCost - dayExpenses - dayAccommodation - dayDepreciation - daySalaries - dayDebtPayments + dayReceivableCollections;
        profitData.push(dayProfit);
      }
      
      profitChartInstance.current = new Chart(profitCtx, {
        type: 'bar',
        data: {
          labels: last7Days,
          datasets: [
            {
              label: 'Laba Harian',
              data: profitData,
              backgroundColor: profitData.map(value => 
                value >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
              ),
              borderColor: profitData.map(value => 
                value >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'
              ),
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Laba/Rugi 7 Hari Terakhir',
              font: {
                size: 14
              }
            },
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'Rp' + value.toLocaleString('id-ID');
                }
              }
            }
          }
        }
      });
    }
    
    // Stock chart (top 5 products by stock)
    if (stockChartRef.current) {
      const stockCtx = stockChartRef.current.getContext('2d');
      
      // Sort products by stock (descending)
      const sortedProducts = [...products].sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, 5);
      
      const productNames = sortedProducts.map(p => p.name || 'Unknown');
      const stockLevels = sortedProducts.map(p => p.stock || 0);
      
      stockChartInstance.current = new Chart(stockCtx, {
        type: 'doughnut',
        data: {
          labels: productNames,
          datasets: [
            {
              data: stockLevels,
              backgroundColor: [
                'rgba(59, 130, 246, 0.7)',
                'rgba(16, 185, 129, 0.7)',
                'rgba(245, 158, 11, 0.7)',
                'rgba(139, 92, 246, 0.7)',
                'rgba(236, 72, 153, 0.7)'
              ],
              borderColor: [
                'rgba(59, 130, 246, 1)',
                'rgba(16, 185, 129, 1)',
                'rgba(245, 158, 11, 1)',
                'rgba(139, 92, 246, 1)',
                'rgba(236, 72, 153, 1)'
              ],
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Stok Produk Tertinggi',
              font: {
                size: 14
              }
            },
            legend: {
              position: 'right'
            }
          }
        }
      });
    }
  };
  
  // Render chart based on selected type
  const renderChart = () => {
    if (!dataLoaded) return;
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    const transactions = StorageManager.get('kasir_transactions') || [];
    
    let chartData;
    let chartLabel;
    
    if (chartType === 'daily') {
      // Group transactions by day for the last 7 days
      const last7Days = [];
      const salesData = [];
      const profitData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        
        const dayTransactions = transactions.filter(t => t.date && t.date.split('T')[0] === dateStr);
        const daySales = dayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
        salesData.push(daySales);
        
        // Calculate profit for the day
        let dayCost = 0;
        dayTransactions.forEach(t => {
          if (t.items) {
            t.items.forEach(item => {
              const productCost = productCosts[item.id] || 0;
              dayCost += productCost * (item.quantity || 0);
            });
          }
        });
        
        // Get expenses for the day
        const dayExpenses = expenses.filter(e => e.date === dateStr)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Get accommodation costs for the day
        const dayAccommodation = accommodationCosts.filter(a => a.date === dateStr)
          .reduce((sum, a) => sum + (a.cost || 0), 0);
        
        // Get depreciation for the day
        const dayDepreciation = calculateDailyDepreciation(dateStr);
        
        // Get salary expenses for the day
        const daySalaries = calculateDailySalaries(dateStr);
        
        // Get debt payments for the day
        const dayDebtPayments = debts.filter(d => d.date === dateStr && d.status === 'paid')
          .reduce((sum, d) => sum + (d.amount || 0), 0);
        
        // Get receivable collections for the day
        const dayReceivableCollections = receivables.filter(r => r.date === dateStr && r.status === 'paid')
          .reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const dayProfit = daySales - dayCost - dayExpenses - dayAccommodation - dayDepreciation - daySalaries - dayDebtPayments + dayReceivableCollections;
        profitData.push(dayProfit);
      }
      
      chartData = {
        labels: last7Days,
        datasets: [
          {
            label: 'Penjualan Harian',
            data: salesData,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Laba Harian',
            data: profitData,
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }
        ]
      };
      
      chartLabel = 'Grafik Penjualan & Laba 7 Hari Terakhir';
    } else if (chartType === 'monthly') {
      // Group transactions by month for the last 6 months
      const last6Months = [];
      const salesData = [];
      const profitData = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth();
        
        last6Months.push(date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
        
        const monthTransactions = transactions.filter(t => {
          if (!t.date) return false;
          const tDate = new Date(t.date);
          return tDate.getFullYear() === year && tDate.getMonth() === month;
        });
        
        const monthSales = monthTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
        salesData.push(monthSales);
        
        // Calculate cost for the month
        let monthCost = 0;
        monthTransactions.forEach(t => {
          if (t.items) {
            t.items.forEach(item => {
              const productCost = productCosts[item.id] || 0;
              monthCost += productCost * (item.quantity || 0);
            });
          }
        });
        
        // Get expenses for the month
        const monthExpenses = expenses.filter(e => {
          if (!e.date) return false;
          const eDate = new Date(e.date);
          return eDate.getFullYear() === year && eDate.getMonth() === month;
        }).reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Get accommodation costs for the month
        const monthAccommodation = accommodationCosts.filter(a => {
          if (!a.date) return false;
          const aDate = new Date(a.date);
          return aDate.getFullYear() === year && aDate.getMonth() === month;
        }).reduce((sum, a) => sum + (a.cost || 0), 0);
        
        // Get depreciation for the month
        const monthDepreciation = calculateMonthlyDepreciation(year, month);
        
        // Get salary expenses for the month
        const monthSalaries = calculateMonthlySalaries(year, month);
        
        // Get debt payments for the month
        const monthDebtPayments = debts.filter(d => {
          if (!d.date) return false;
          const dDate = new Date(d.date);
          return dDate.getFullYear() === year && dDate.getMonth() === month && d.status === 'paid';
        }).reduce((sum, d) => sum + (d.amount || 0), 0);
        
        // Get receivable collections for the month
        const monthReceivableCollections = receivables.filter(r => {
          if (!r.date) return false;
          const rDate = new Date(r.date);
          return rDate.getFullYear() === year && rDate.getMonth() === month && r.status === 'paid';
        }).reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const monthProfit = monthSales - monthCost - monthExpenses - monthAccommodation - monthDepreciation - monthSalaries - monthDebtPayments + monthReceivableCollections;
        profitData.push(monthProfit);
      }
      
      chartData = {
        labels: last6Months,
        datasets: [
          {
            label: 'Penjualan Bulanan',
            data: salesData,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Laba Bulanan',
            data: profitData,
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }
        ]
      };
      
      chartLabel = 'Grafik Penjualan & Laba 6 Bulan Terakhir';
    } else {
      // Group transactions by year for the last 5 years
      const last5Years = [];
      const salesData = [];
      const profitData = [];
      
      const currentYear = new Date().getFullYear();
      for (let i = 4; i >= 0; i--) {
        const year = currentYear - i;
        last5Years.push(year.toString());
        
        const yearTransactions = transactions.filter(t => {
          if (!t.date) return false;
          const tDate = new Date(t.date);
          return tDate.getFullYear() === year;
        });
        
        const yearSales = yearTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
        salesData.push(yearSales);
        
        // Calculate cost for the year
        let yearCost = 0;
        yearTransactions.forEach(t => {
          if (t.items) {
            t.items.forEach(item => {
              const productCost = productCosts[item.id] || 0;
              yearCost += productCost * (item.quantity || 0);
            });
          }
        });
        
        // Get expenses for the year
        const yearExpenses = expenses.filter(e => {
          if (!e.date) return false;
          const eDate = new Date(e.date);
          return eDate.getFullYear() === year;
        }).reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Get accommodation costs for the year
        const yearAccommodation = accommodationCosts.filter(a => {
          if (!a.date) return false;
          const aDate = new Date(a.date);
          return aDate.getFullYear() === year;
        }).reduce((sum, a) => sum + (a.cost || 0), 0);
        
        // Get depreciation for the year
        const yearDepreciation = calculateYearlyDepreciation(year);
        
        // Get salary expenses for the year
        const yearSalaries = calculateYearlySalaries(year);
        
        // Get debt payments for the year
        const yearDebtPayments = debts.filter(d => {
          if (!d.date) return false;
          const dDate = new Date(d.date);
          return dDate.getFullYear() === year && d.status === 'paid';
        }).reduce((sum, d) => sum + (d.amount || 0), 0);
        
        // Get receivable collections for the year
        const yearReceivableCollections = receivables.filter(r => {
          if (!r.date) return false;
          const rDate = new Date(r.date);
          return rDate.getFullYear() === year && r.status === 'paid';
        }).reduce((sum, r) => sum + (r.amount || 0), 0);
        
        const yearProfit = yearSales - yearCost - yearExpenses - yearAccommodation - yearDepreciation - yearSalaries - yearDebtPayments + yearReceivableCollections;
        profitData.push(yearProfit);
      }
      
      chartData = {
        labels: last5Years,
        datasets: [
          {
            label: 'Penjualan Tahunan',
            data: salesData,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Laba Tahunan',
            data: profitData,
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }
        ]
      };
      
      chartLabel = 'Grafik Penjualan & Laba 5 Tahun Terakhir';
    }
    
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: chartLabel,
            font: {
              size: 16
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'Rp' + value.toLocaleString('id-ID');
              }
            }
          }
        }
      }
    });
  };
  
  // Handle chart type change
  const handleChartTypeChange = (type) => {
    setChartType(type);
  };
  
  // Kasir functions
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: (item.quantity || 0) + 1 } 
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };
  
  const updateCartItemQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.id !== id));
    } else {
      setCart(prevCart => 
        prevCart.map(item => 
          item.id === id ? { ...item, quantity } : item
        )
      );
    }
  };
  
  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };
  
  const calculateTotal = () => {
    const subtotal = cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);
    const discountAmount = subtotal * (discount / 100);
    return subtotal - discountAmount;
  };
  
  const calculateChange = () => {
    return customerMoney - calculateTotal();
  };
  
  const processSale = () => {
    if (cart.length === 0) return;
    
    // Update product stock
    const updatedProducts = products.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      if (cartItem) {
        return { ...product, stock: (product.stock || 0) - (cartItem.quantity || 0) };
      }
      return product;
    });
    
    setProducts(updatedProducts);
    
    // Save transaction
    const transaction = {
      id: Date.now(),
      date: new Date().toISOString(),
      items: cart,
      discount,
      total: calculateTotal(),
      payment: customerMoney,
      change: calculateChange()
    };
    
    const transactions = StorageManager.get('kasir_transactions') || [];
    StorageManager.set('kasir_transactions', [...transactions, transaction]);
    
    // Reset cart and form
    setCart([]);
    setDiscount(0);
    setCustomerMoney(0);
    
    alert('Transaksi berhasil!');
  };
  
  const printReceipt = () => {
    if (cart.length === 0) return;
    
    const receiptContent = `
      <html>
        <head>
          <title>Struk Pembelian</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>TOKO KU</h2>
            <p>${new Date().toLocaleString('id-ID')}</p>
          </div>
          <div>
            ${cart.map(item => `
              <div class="item">
                <span>${item.name} x${item.quantity || 0}</span>
                <span>${formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
              </div>
            `).join('')}
          </div>
          <div class="item">
            <span>Diskon (${discount}%)</span>
            <span>${formatCurrency(calculateTotal() * (discount / 100))}</span>
          </div>
          <div class="item total">
            <span>Total</span>
            <span>${formatCurrency(calculateTotal())}</span>
          </div>
          <div class="item">
            <span>Bayar</span>
            <span>${formatCurrency(customerMoney)}</span>
          </div>
          <div class="item">
            <span>Kembali</span>
            <span>${formatCurrency(calculateChange())}</span>
          </div>
          <div style="margin-top: 20px; text-align: center;">
            <p>Terima kasih atas kunjungan Anda!</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
  };
  
  // Product functions
  const startEditingProduct = (product) => {
    setEditingProduct(product);
  };
  
  const cancelEditingProduct = () => {
    setEditingProduct(null);
  };
  
  const saveEditedProduct = () => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
    }
  };
  
  const handleProductImageUpload = (e) => {
    if (!editingProduct) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditingProduct({
        ...editingProduct,
        image: event.target.result
      });
    };
    reader.readAsDataURL(file);
  };
  
  const handleNewProductImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setNewProductImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  const triggerNewProductImageUpload = () => {
    if (newProductImageRef.current) {
      newProductImageRef.current.click();
    }
  };
  
  const resetNewProductForm = () => {
    setNewProduct({ 
      name: '', 
      price: 0, 
      stock: 0,
      category: '',
      description: '',
      unit: 'pcs',
      weight: 0,
      weightUnit: 'gram',
      cost: 0,
      supplier: '',
      minStock: 0
    });
    setNewProductImage(null);
    if (newProductImageRef.current) {
      newProductImageRef.current.value = '';
    }
  };
  
  // Product cost functions
  const updateProductCost = (productId, cost) => {
    setProductCosts(prevCosts => ({
      ...prevCosts,
      [productId]: cost
    }));
  };
  
  const updateProductDetail = (productId, field, value) => {
    setProductDetails(prevDetails => ({
      ...prevDetails,
      [productId]: {
        ...(prevDetails[productId] || {}),
        [field]: value
      }
    }));
  };
  
  const calculateProductProfit = (product) => {
    const cost = productCosts[product.id] || 0;
    return (product.price || 0) - cost;
  };
  
  const calculateProductProfitMargin = (product) => {
    const cost = productCosts[product.id] || 0;
    if ((product.price || 0) === 0) return 0;
    return (((product.price || 0) - cost) / (product.price || 0)) * 100;
  };
  
  // Calculate HPP per unit based on weight and other factors
  const calculateDetailedHPP = (productId) => {
    const details = productDetails[productId] || {};
    const baseCost = productCosts[productId] || 0;
    
    // If we have weight information, calculate cost per gram/kg
    if (details.weight && details.weightUnit) {
      let weightInKg = details.weight;
      if (details.weightUnit === 'gram') {
        weightInKg = details.weight / 1000;
      }
      
      // Cost per kg
      const costPerKg = baseCost / weightInKg;
      
      // Add additional costs (packaging, processing, etc.)
      const packagingCost = details.packagingCost || 0;
      const processingCost = details.processingCost || 0;
      const otherCosts = details.otherCosts || 0;
      
      // Total cost per kg
      const totalCostPerKg = costPerKg + packagingCost + processingCost + otherCosts;
      
      // Return cost per unit based on weight
      return totalCostPerKg * weightInKg;
    }
    
    return baseCost;
  };
  
  // Expense functions
  const addExpense = () => {
    if (newExpense.category && newExpense.description && newExpense.amount > 0) {
      setExpenses([...expenses, { ...newExpense, id: Date.now() }]);
      setNewExpense({
        category: '',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0]
      });
    }
  };
  
  const removeExpense = (id) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };
  
  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
  };
  
  const calculateExpensesByCategory = () => {
    const categoryTotals = {};
    
    expenses.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += (expense.amount || 0);
    });
    
    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount
    }));
  };
  
  const generateMonthlyExpenseReport = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyExpenses = expenses.filter(expense => {
      if (!expense.date) return false;
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
    
    const totalExpenses = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    // Group by category
    const categoryTotals = {};
    monthlyExpenses.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += (expense.amount || 0);
    });
    
    return {
      month: currentMonth + 1,
      year: currentYear,
      totalExpenses,
      categoryBreakdown: Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount
      }))
    };
  };
  
  // Accommodation costs functions
  const addAccommodation = () => {
    if (newAccommodation.description && newAccommodation.cost > 0) {
      setAccommodationCosts([...accommodationCosts, { ...newAccommodation, id: Date.now() }]);
      setNewAccommodation({
        type: 'supplier_to_kitchen',
        date: new Date().toISOString().split('T')[0],
        description: '',
        distance: 0,
        cost: 0,
        vehicle: ''
      });
    }
  };
  
  const removeAccommodation = (id) => {
    setAccommodationCosts(accommodationCosts.filter(cost => cost.id !== id));
  };
  
  const calculateTotalAccommodationCosts = () => {
    return accommodationCosts.reduce((total, cost) => total + (cost.cost || 0), 0);
  };
  
  // Asset and depreciation functions
  const addAsset = () => {
    if (newAsset.name && newAsset.purchasePrice > 0) {
      // Calculate depreciation values
      const purchaseDate = new Date(newAsset.purchaseDate);
      const currentDate = new Date();
      
      // Calculate years difference
      const yearsDiff = (currentDate - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
      
      let annualDepreciation = 0;
      let accumulatedDepreciation = 0;
      let bookValue = newAsset.purchasePrice;
      
      if (newAsset.depreciationMethod === 'straight_line') {
        // Straight line method
        annualDepreciation = (newAsset.purchasePrice - newAsset.salvageValue) / newAsset.usefulLife;
        accumulatedDepreciation = annualDepreciation * yearsDiff;
        bookValue = Math.max(newAsset.salvageValue, newAsset.purchasePrice - accumulatedDepreciation);
      } else {
        // Reducing balance method
        const depreciationRate = 2 / newAsset.usefulLife;
        let currentBookValue = newAsset.purchasePrice;
        
        for (let i = 0; i < Math.floor(yearsDiff); i++) {
          const yearDepreciation = currentBookValue * depreciationRate;
          accumulatedDepreciation += yearDepreciation;
          currentBookValue -= yearDepreciation;
          
          // Don't depreciate below salvage value
          if (currentBookValue <= newAsset.salvageValue) {
            currentBookValue = newAsset.salvageValue;
            break;
          }
        }
        
        annualDepreciation = currentBookValue * depreciationRate;
        bookValue = Math.max(newAsset.salvageValue, currentBookValue);
      }
      
      const asset = {
        ...newAsset,
        id: Date.now(),
        annualDepreciation,
        accumulatedDepreciation,
        bookValue,
        status: 'active'
      };
      
      setAssets([...assets, asset]);
      setNewAsset({
        name: '',
        category: 'Peralatan Masak',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: 0,
        usefulLife: 5,
        salvageValue: 0,
        depreciationMethod: 'straight_line'
      });
    }
  };
  
  const removeAsset = (id) => {
    setAssets(assets.filter(asset => asset.id !== id));
  };
  
  const calculateDepreciation = (asset, date) => {
    if (asset.depreciationMethod === 'straight_line') {
      const purchaseDate = new Date(asset.purchaseDate);
      const currentDate = new Date(date);
      
      // Calculate years difference
      const yearsDiff = (currentDate - purchaseDate) / (365 * 24 * 60 * 60 * 1000);
      
      // Annual depreciation
      const annualDepreciation = (asset.purchasePrice - asset.salvageValue) / asset.usefulLife;
      
      // Total depreciation up to this date
      const totalDepreciation = annualDepreciation * yearsDiff;
      
      return {
        annual: annualDepreciation,
        total: totalDepreciation,
        remaining: Math.max(0, asset.purchasePrice - totalDepreciation - asset.salvageValue)
      };
    } else {
      // Reducing balance method
      const purchaseDate = new Date(asset.purchaseDate);
      const currentDate = new Date(date);
      
      // Calculate years difference
      const yearsDiff = Math.floor((currentDate - purchaseDate) / (365 * 24 * 60 * 60 * 1000));
      
      // Depreciation rate (double declining balance)
      const depreciationRate = 2 / asset.usefulLife;
      
      let bookValue = asset.purchasePrice;
      let totalDepreciation = 0;
      
      for (let i = 0; i < yearsDiff; i++) {
        const annualDepreciation = bookValue * depreciationRate;
        totalDepreciation += annualDepreciation;
        bookValue -= annualDepreciation;
        
        // Don't depreciate below salvage value
        if (bookValue <= asset.salvageValue) {
          bookValue = asset.salvageValue;
          break;
        }
      }
      
      return {
        annual: bookValue * depreciationRate,
        total: totalDepreciation,
        remaining: Math.max(0, bookValue - asset.salvageValue)
      };
    }
  };
  
  const calculateDailyDepreciation = (date) => {
    let totalDepreciation = 0;
    
    assets.forEach(asset => {
      const depreciation = calculateDepreciation(asset, date);
      // Calculate daily depreciation
      const dailyDepreciation = depreciation.annual / 365;
      totalDepreciation += dailyDepreciation;
    });
    
    return totalDepreciation;
  };
  
  const calculateMonthlyDepreciation = (year, month) => {
    let totalDepreciation = 0;
    
    assets.forEach(asset => {
      const depreciation = calculateDepreciation(asset, `${year}-${month + 1}-01`);
      // Calculate monthly depreciation
      const monthlyDepreciation = depreciation.annual / 12;
      totalDepreciation += monthlyDepreciation;
    });
    
    return totalDepreciation;
  };
  
  const calculateYearlyDepreciation = (year) => {
    let totalDepreciation = 0;
    
    assets.forEach(asset => {
      const depreciation = calculateDepreciation(asset, `${year}-01-01`);
      totalDepreciation += depreciation.annual;
    });
    
    return totalDepreciation;
  };
  
  // Founder Share Calculator functions
  const updateFounderData = (index, field, value) => {
    setFounderData(prevData => {
      const newData = [...prevData];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };
  
  const addFounder = () => {
    const newId = founderData.length > 0 ? Math.max(...founderData.map(f => f.id)) + 1 : 1;
    setFounderData([...founderData, { 
      id: newId, 
      name: `Founder ${newId}`, 
      percentage: 0
    }]);
  };
  
  const removeFounder = (id) => {
    if (founderData.length <= 1) {
      alert('Minimal harus ada satu founder!');
      return;
    }
    setFounderData(founderData.filter(founder => founder.id !== id));
  };
  
  const startEditingFounder = (founder) => {
    setEditingFounder({ ...founder });
  };
  
  const cancelEditingFounder = () => {
    setEditingFounder(null);
  };
  
  const saveEditedFounder = () => {
    if (editingFounder) {
      setFounderData(founderData.map(f => f.id === editingFounder.id ? editingFounder : f));
      setEditingFounder(null);
    }
  };
  
  const calculateFounderShares = () => {
    // Calculate percentages based on input
    const totalPercentage = founderData.reduce((sum, founder) => sum + (founder.percentage || 0), 0);
    
    // Normalize to 100% if needed
    const normalizedShares = founderData.map(founder => ({
      id: founder.id,
      name: founder.name || '',
      percentage: totalPercentage > 0 ? (founder.percentage / totalPercentage) * 100 : 0
    }));
    
    return normalizedShares;
  };
  
  const founderShares = calculateFounderShares();
  
  // Electricity Management functions
  const addElectricityVoucher = (voucher) => {
    setElectricityData(prevData => ({
      ...prevData,
      vouchers: [...prevData.vouchers, { ...voucher, id: Date.now() }],
      lastTopUp: new Date().toISOString(),
      lastTopUpAmount: voucher.amount || 0
    }));
  };
  
  const addElectricityDevice = (device) => {
    setElectricityData(prevData => ({
      ...prevData,
      devices: [...prevData.devices, { ...device, id: Date.now() }]
    }));
  };
  
  const removeElectricityVoucher = (id) => {
    setElectricityData(prevData => ({
      ...prevData,
      vouchers: prevData.vouchers.filter(voucher => voucher.id !== id)
    }));
  };
  
  const removeElectricityDevice = (id) => {
    setElectricityData(prevData => ({
      ...prevData,
      devices: prevData.devices.filter(device => device.id !== id)
    }));
  };
  
  const updateMaxPower = (power) => {
    setElectricityData(prevData => ({
      ...prevData,
      maxPower: power
    }));
  };
  
  const calculateElectricityUsage = () => {
    const totalPower = electricityData.devices.reduce((sum, device) => sum + (device.watt || 0), 0);
    const dailyUsage = (totalPower * 24) / 1000; // kWh per day
    const monthlyUsage = dailyUsage * 30;
    const yearlyUsage = dailyUsage * 365;
    
    // Find the most recent voucher
    const activeVoucher = electricityData.vouchers.length > 0 
      ? electricityData.vouchers.reduce((latest, voucher) => 
          !latest || new Date(voucher.date) > new Date(latest.date) ? voucher : latest
        )
      : null;
    
    let expiryDate = null;
    let estimatedCost = 0;
    let dailyCost = 0;
    let monthlyCost = 0;
    
    // Calculate electricity rate (assuming average electricity rate of Rp 1,444.70 per kWh)
    const electricityRate = 1444.70;
    
    if (activeVoucher) {
      // Convert voucher amount to kWh (assuming Rp 1,444.70 per kWh)
      const voucherKwh = (activeVoucher.amount || 0) / electricityRate;
      const remainingKwh = voucherKwh - (dailyUsage * ((new Date() - new Date(activeVoucher.date)) / (24 * 60 * 60 * 1000)));
      const daysLeft = remainingKwh / dailyUsage;
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysLeft);
      
      // Estimate cost
      estimatedCost = monthlyUsage * electricityRate;
      dailyCost = dailyUsage * electricityRate;
      monthlyCost = estimatedCost;
    } else {
      // If no voucher, calculate based on usage
      dailyCost = dailyUsage * electricityRate;
      monthlyCost = monthlyUsage * electricityRate;
      estimatedCost = monthlyCost;
    }
    
    // Calculate power usage percentage
    const powerUsagePercentage = electricityData.maxPower > 0 
      ? (totalPower / electricityData.maxPower) * 100 
      : 0;
    
    return {
      totalPower,
      maxPower: electricityData.maxPower,
      powerUsagePercentage,
      dailyUsage,
      monthlyUsage,
      yearlyUsage,
      expiryDate,
      dailyCost,
      monthlyCost,
      estimatedCost,
      lastTopUp: electricityData.lastTopUp,
      lastTopUpAmount: electricityData.lastTopUpAmount
    };
  };
  
  const electricityUsage = calculateElectricityUsage();
  
  // HR & Salary functions
  const addEmployee = (employee) => {
    // Generate unique ID for employee
    const employeeId = Date.now();
    
    setEmployees(prevEmployees => [...prevEmployees, { 
      ...employee, 
      id: employeeId,
      paymentStatus: 'unpaid',
      joinDate: new Date().toISOString().split('T')[0]
    }]);
  };
  
  const updateEmployee = (id, field, value) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(employee => 
        employee.id === id ? { ...employee, [field]: value } : employee
      )
    );
  };
  
  const removeEmployee = (id) => {
    setEmployees(prevEmployees => prevEmployees.filter(employee => employee.id !== id));
  };
  
  const calculateSalary = (employee) => {
    const baseSalary = employee.baseSalary || 0;
    const allowances = employee.allowances || 0;
    const deductions = employee.deductions || 0;
    
    return baseSalary + allowances - deductions;
  };
  
  const markEmployeeAsPaid = (id) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(employee => 
        employee.id === id ? { ...employee, paymentStatus: 'paid' } : employee
      )
    );
  };
  
  const markEmployeeAsUnpaid = (id) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(employee => 
        employee.id === id ? { ...employee, paymentStatus: 'unpaid' } : employee
      )
    );
  };
  
  const generatePayslip = (employee) => {
    const salary = calculateSalary(employee);
    
    const payslipContent = `
      <html>
        <head>
          <title>Slip Gaji - ${employee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>SLIP GAJI</h2>
            <p>${new Date().toLocaleDateString('id-ID')}</p>
          </div>
          <div class="section">
            <h3>Data Karyawan</h3>
            <div class="row">
              <span>Nama:</span>
              <span>${employee.name}</span>
            </div>
            <div class="row">
              <span>Jabatan:</span>
              <span>${employee.position}</span>
            </div>
            <div class="row">
              <span>Tipe:</span>
              <span>${employee.employmentType === 'full_time' ? 'Full Time' : 'Part Time'}</span>
            </div>
            <div class="row">
              <span>Periode:</span>
              <span>${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          <div class="section">
            <h3>Rincian Gaji</h3>
            <div class="row">
              <span>Gaji Pokok:</span>
              <span>${formatCurrency(employee.baseSalary || 0)}</span>
            </div>
            <div class="row">
              <span>Tunjangan:</span>
              <span>${formatCurrency(employee.allowances || 0)}</span>
            </div>
            <div class="row">
              <span>Potongan:</span>
              <span>${formatCurrency(employee.deductions || 0)}</span>
            </div>
            <div class="row total">
              <span>Total Gaji:</span>
              <span>${formatCurrency(salary)}</span>
            </div>
          </div>
          <div style="margin-top: 30px; text-align: center;">
            <p>Ini adalah slip gaji yang dihasilkan oleh sistem.</p>
            <p>Tanda tangan digital: ${Date.now()}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(payslipContent);
    printWindow.document.close();
    printWindow.print();
  };
  
  const calculateTotalSalaryExpense = () => {
    return employees.reduce((total, employee) => {
      if (employee.paymentStatus === 'paid') {
        return total + calculateSalary(employee);
      }
      return total;
    }, 0);
  };
  
  const calculateUnpaidSalaries = () => {
    return employees.reduce((total, employee) => {
      if (employee.paymentStatus === 'unpaid') {
        return total + calculateSalary(employee);
      }
      return total;
    }, 0);
  };
  
  // Calculate salary expenses for a specific date
  const calculateDailySalaries = (date) => {
    // Get work history for the date
    const dayWorkHistory = employeeWorkHistory.filter(record => record.date === date);
    
    // Calculate total salary for the day
    return dayWorkHistory.reduce((total, record) => {
      return total + (record.hours * record.hourlyRate);
    }, 0);
  };
  
  // Calculate salary expenses for a specific month
  const calculateMonthlySalaries = (year, month) => {
    // Get full-time employees paid in the month
    const fullTimeEmployees = employees.filter(employee => 
      employee.employmentType === 'full_time' && employee.paymentStatus === 'paid'
    );
    
    // Get work history for the month
    const monthWorkHistory = employeeWorkHistory.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === year && recordDate.getMonth() === month;
    });
    
    // Calculate total salary for the month
    const fullTimeSalaries = fullTimeEmployees.reduce((total, employee) => {
      return total + calculateSalary(employee);
    }, 0);
    
    const partTimeSalaries = monthWorkHistory.reduce((total, record) => {
      return total + (record.hours * record.hourlyRate);
    }, 0);
    
    return fullTimeSalaries + partTimeSalaries;
  };
  
  // Calculate salary expenses for a specific year
  const calculateYearlySalaries = (year) => {
    // Get full-time employees paid in the year
    const fullTimeEmployees = employees.filter(employee => 
      employee.employmentType === 'full_time' && employee.paymentStatus === 'paid'
    );
    
    // Get work history for the year
    const yearWorkHistory = employeeWorkHistory.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === year;
    });
    
    // Calculate total salary for the year
    const fullTimeSalaries = fullTimeEmployees.reduce((total, employee) => {
      return total + calculateSalary(employee);
    }, 0);
    
    const partTimeSalaries = yearWorkHistory.reduce((total, record) => {
      return total + (record.hours * record.hourlyRate);
    }, 0);
    
    return fullTimeSalaries + partTimeSalaries;
  };
  
  // Work history functions
  const addWorkRecord = (employeeId, record) => {
    setEmployeeWorkHistory(prevHistory => [
      ...prevHistory,
      {
        ...record,
        id: Date.now(),
        employeeId
      }
    ]);
  };
  
  const removeWorkRecord = (id) => {
    setEmployeeWorkHistory(prevHistory => prevHistory.filter(record => record.id !== id));
  };
  
  const getEmployeeWorkHistory = (employeeId) => {
    return employeeWorkHistory.filter(record => record.employeeId === employeeId);
  };
  
  const calculateEmployeeMonthlyEarnings = (employeeId, year, month) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return 0;
    
    if (employee.employmentType === 'full_time') {
      // For full-time employees, return their monthly salary if paid
      return employee.paymentStatus === 'paid' ? calculateSalary(employee) : 0;
    } else {
      // For part-time employees, calculate from work history
      const monthWorkHistory = employeeWorkHistory.filter(record => {
        if (record.employeeId !== employeeId || !record.date) return false;
        const recordDate = new Date(record.date);
        return recordDate.getFullYear() === year && recordDate.getMonth() === month;
      });
      
      return monthWorkHistory.reduce((total, record) => {
        return total + (record.hours * record.hourlyRate);
      }, 0);
    }
  };
  
  // Salary increase simulation
  const openSalaryIncreaseModal = (employee) => {
    setSelectedEmployee(employee);
    setNewSalary(employee.baseSalary || 0);
    
    // Calculate impact
    const currentSalary = calculateSalary(employee);
    const newTotalSalary = newSalary + (employee.allowances || 0) - (employee.deductions || 0);
    const difference = newTotalSalary - currentSalary;
    
    // Calculate monthly impact
    const monthlyImpact = difference;
    
    // Calculate yearly impact
    const yearlyImpact = difference * 12;
    
    // Calculate profit impact (assuming 10% profit margin)
    const profitImpact = difference * 10;
    
    setSalaryImpact({
      currentSalary,
      newTotalSalary,
      difference,
      monthlyImpact,
      yearlyImpact,
      profitImpact
    });
    
    setShowSalaryIncreaseModal(true);
  };
  
  const confirmSalaryIncrease = () => {
    if (selectedEmployee && newSalary > 0) {
      updateEmployee(selectedEmployee.id, 'baseSalary', newSalary);
      setShowSalaryIncreaseModal(false);
      alert(`Gaji ${selectedEmployee.name} berhasil diperbarui!`);
    }
  };
  
  // Supplier functions
  const addSupplier = () => {
    if (newSupplier.name) {
      setSuppliers([...suppliers, { ...newSupplier, id: Date.now() }]);
      setNewSupplier({
        name: '',
        contact: '',
        address: '',
        email: '',
        phone: ''
      });
    }
  };
  
  const updateSupplier = (id, field, value) => {
    setSuppliers(prevSuppliers => 
      prevSuppliers.map(supplier => 
        supplier.id === id ? { ...supplier, [field]: value } : supplier
      )
    );
  };
  
  const removeSupplier = (id) => {
    setSuppliers(suppliers.filter(supplier => supplier.id !== id));
  };
  
  // Stock Opname functions
  const startStockOpname = () => {
    // Initialize new stock opname with all products
    const items = products.map(product => ({
      productId: product.id,
      productName: product.name,
      systemStock: product.stock || 0,
      actualStock: product.stock || 0,
      difference: 0,
      notes: ''
    }));
    
    setNewStockOpname({
      date: new Date().toISOString().split('T')[0],
      notes: '',
      items
    });
  };
  
  const updateStockOpnameItem = (index, field, value) => {
    const updatedItems = [...newStockOpname.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate difference
    if (field === 'actualStock') {
      updatedItems[index].difference = value - (updatedItems[index].systemStock || 0);
    }
    
    setNewStockOpname({
      ...newStockOpname,
      items: updatedItems
    });
  };
  
  const saveStockOpname = () => {
    if (newStockOpname.items.length > 0) {
      // Update product stock based on actual count
      const updatedProducts = products.map(product => {
        const opnameItem = newStockOpname.items.find(item => item.productId === product.id);
        if (opnameItem) {
          return { ...product, stock: opnameItem.actualStock };
        }
        return product;
      });
      
      setProducts(updatedProducts);
      
      // Save stock opname record
      setStockOpname([...stockOpname, { ...newStockOpname, id: Date.now() }]);
      
      // Reset form
      setNewStockOpname({
        date: new Date().toISOString().split('T')[0],
        notes: '',
        items: []
      });
      
      alert('Stock opname berhasil disimpan!');
    }
  };
  
  // Category management functions
  const addCategory = () => {
    if (newCategory.trim() !== '') {
      if (categoryType === 'expense') {
        if (!expenseCategories.includes(newCategory.trim())) {
          setExpenseCategories([...expenseCategories, newCategory.trim()]);
          setNewCategory('');
        }
      } else if (categoryType === 'asset') {
        if (!assetCategories.includes(newCategory.trim())) {
          setAssetCategories([...assetCategories, newCategory.trim()]);
          setNewCategory('');
        }
      }
    }
  };
  
  const removeCategory = (category) => {
    if (categoryType === 'expense') {
      setExpenseCategories(expenseCategories.filter(cat => cat !== category));
    } else if (categoryType === 'asset') {
      setAssetCategories(assetCategories.filter(cat => cat !== category));
    }
  };
  
  const updateCategory = (oldCategory, newCategory) => {
    if (newCategory.trim() !== '' && oldCategory !== newCategory.trim()) {
      if (categoryType === 'expense') {
        // Update category in expenses
        const updatedExpenses = expenses.map(expense => 
          expense.category === oldCategory ? { ...expense, category: newCategory.trim() } : expense
        );
        setExpenses(updatedExpenses);
        
        // Update category list
        setExpenseCategories(expenseCategories.map(cat => 
          cat === oldCategory ? newCategory.trim() : cat
        ));
      } else if (categoryType === 'asset') {
        // Update category in assets
        const updatedAssets = assets.map(asset => 
          asset.category === oldCategory ? { ...asset, category: newCategory.trim() } : asset
        );
        setAssets(updatedAssets);
        
        // Update category list
        setAssetCategories(assetCategories.map(cat => 
          cat === oldCategory ? newCategory.trim() : cat
        ));
      }
    }
  };
  
  // Profit distribution functions
  const updateProfitDistribution = (field, value) => {
    setProfitDistribution(prevDistribution => ({
      ...prevDistribution,
      [field]: value
    }));
  };
  
  const calculateProfitDistribution = (netProfit) => {
    const businessAmount = netProfit * (profitDistribution.businessPercentage / 100);
    const founderAmount = netProfit * (profitDistribution.founderPercentage / 100);
    
    const businessSavingsAmount = businessAmount * (profitDistribution.businessSavingsPercentage / 100);
    const businessOperationalAmount = businessAmount * (profitDistribution.businessOperationalPercentage / 100);
    
    return {
      netProfit,
      businessAmount,
      founderAmount,
      businessSavingsAmount,
      businessOperationalAmount,
      founderShares: founderShares.map(founder => ({
        id: founder.id,
        name: founder.name,
        percentage: founder.percentage,
        amount: founderAmount * (founder.percentage / 100)
      }))
    };
  };
  
  const distributeProfit = (date, netProfit) => {
    const distribution = calculateProfitDistribution(netProfit);
    
    // Create financial records for profit distribution
    const records = [
      {
        id: Date.now(),
        date,
        type: 'profit_distribution',
        category: 'business_share',
        description: 'Bagian Usaha',
        amount: distribution.businessAmount
      },
      {
        id: Date.now() + 1,
        date,
        type: 'profit_distribution',
        category: 'founder_share',
        description: 'Bagian Founder',
        amount: distribution.founderAmount
      },
      {
        id: Date.now() + 2,
        date,
        type: 'profit_distribution',
        category: 'business_savings',
        description: 'Simpanan Usaha',
        amount: distribution.businessSavingsAmount
      }
    ];
    
    // Add records for each founder
    distribution.founderShares.forEach((founder, index) => {
      records.push({
        id: Date.now() + 3 + index,
        date,
        type: 'profit_distribution',
        category: `founder_payment_${index + 1}`,
        description: `Pembagian Laba - ${founder.name}`,
        amount: founder.amount
      });
    });
    
    // Add records to financial records
    setFinancialRecords(prevRecords => [...prevRecords, ...records]);
    
    return distribution;
  };
  
  // Debt and receivable functions
  const addDebt = () => {
    if (newDebt.name && newDebt.amount > 0) {
      setDebts([...debts, { ...newDebt, id: Date.now() }]);
      setNewDebt({
        name: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        description: '',
        status: 'unpaid'
      });
    }
  };
  
  const removeDebt = (id) => {
    setDebts(debts.filter(debt => debt.id !== id));
  };
  
  const markDebtAsPaid = (id) => {
    setDebts(prevDebts => 
      prevDebts.map(debt => 
        debt.id === id ? { ...debt, status: 'paid' } : debt
      )
    );
  };
  
  const markDebtAsUnpaid = (id) => {
    setDebts(prevDebts => 
      prevDebts.map(debt => 
        debt.id === id ? { ...debt, status: 'unpaid' } : debt
      )
    );
  };
  
  const calculateTotalDebts = () => {
    return debts.reduce((total, debt) => total + (debt.amount || 0), 0);
  };
  
  const calculatePaidDebts = () => {
    return debts.filter(debt => debt.status === 'paid')
      .reduce((sum, debt) => sum + (debt.amount || 0), 0);
  };
  
  const calculateUnpaidDebts = () => {
    return debts.filter(debt => debt.status === 'unpaid')
      .reduce((sum, debt) => sum + (debt.amount || 0), 0);
  };
  
  const addReceivable = () => {
    if (newReceivable.name && newReceivable.amount > 0) {
      setReceivables([...receivables, { ...newReceivable, id: Date.now() }]);
      setNewReceivable({
        name: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        description: '',
        status: 'unpaid'
      });
    }
  };
  
  const removeReceivable = (id) => {
    setReceivables(receivables.filter(receivable => receivable.id !== id));
  };
  
  const markReceivableAsPaid = (id) => {
    setReceivables(prevReceivables => 
      prevReceivables.map(receivable => 
        receivable.id === id ? { ...receivable, status: 'paid' } : receivable
      )
    );
  };
  
  const markReceivableAsUnpaid = (id) => {
    setReceivables(prevReceivables => 
      prevReceivables.map(receivable => 
        receivable.id === id ? { ...receivable, status: 'unpaid' } : receivable
      )
    );
  };
  
  const calculateTotalReceivables = () => {
    return receivables.reduce((total, receivable) => total + (receivable.amount || 0), 0);
  };
  
  const calculatePaidReceivables = () => {
    return receivables.filter(receivable => receivable.status === 'paid')
      .reduce((sum, receivable) => sum + (receivable.amount || 0), 0);
  };
  
  const calculateUnpaidReceivables = () => {
    return receivables.filter(receivable => receivable.status === 'unpaid')
      .reduce((sum, receivable) => sum + (receivable.amount || 0), 0);
  };
  
  // Employee edit functions
  const startEditingEmployee = (employee) => {
    setEditingEmployee({...employee});
  };
  
  const cancelEditingEmployee = () => {
    setEditingEmployee(null);
  };
  
  const saveEditedEmployee = () => {
    if (editingEmployee) {
      setEmployees(employees.map(emp => emp.id === editingEmployee.id ? editingEmployee : emp));
      setEditingEmployee(null);
    }
  };
  
  // Reset all data
  const resetAllData = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan.')) {
      StorageManager.resetData();
      
      // Reset all state
      setProducts([]);
      setCart([]);
      setDiscount(0);
      setCustomerMoney(0);
      setEditingProduct(null);
      setNewProductImage(null);
      setFounderData([
        { id: 1, name: 'Founder A', percentage: 50 },
        { id: 2, name: 'Founder B', percentage: 50 }
      ]);
      setElectricityData({
        vouchers: [],
        devices: [],
        maxPower: 900,
        lastTopUp: null,
        lastTopUpAmount: 0
      });
      setEmployees([]);
      setEmployeeWorkHistory([]);
      setExpenses([]);
      setAccommodationCosts([]);
      setAssets([]);
      setProductCosts({});
      setProductDetails({});
      setSuppliers([]);
      setStockOpname([]);
      setFinancialRecords([]);
      setDebts([]);
      setReceivables([]);
      
      alert('Semua data telah dihapus!');
    }
  };
  
  // Export & Import functions
  const exportToJSON = () => {
    const data = StorageManager.exportData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kasir_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const importFromJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        StorageManager.importData(data);
        
        // Reload data
        const savedProducts = StorageManager.get('kasir_products');
        if (savedProducts) setProducts(savedProducts);
        
        const savedFounderData = StorageManager.get('kasir_founder');
        if (savedFounderData) setFounderData(savedFounderData);
        
        const savedElectricityData = StorageManager.get('kasir_electricity');
        if (savedElectricityData) setElectricityData(savedElectricityData);
        
        const savedEmployees = StorageManager.get('kasir_employees');
        if (savedEmployees) setEmployees(savedEmployees);
        
        const savedWorkHistory = StorageManager.get('kasir_work_history');
        if (savedWorkHistory) setEmployeeWorkHistory(savedWorkHistory);
        
        const savedExpenses = StorageManager.get('kasir_expenses');
        if (savedExpenses) setExpenses(savedExpenses);
        
        const savedExpenseCategories = StorageManager.get('kasir_expense_categories');
        if (savedExpenseCategories) setExpenseCategories(savedExpenseCategories);
        
        const savedAccommodationCosts = StorageManager.get('kasir_accommodation');
        if (savedAccommodationCosts) setAccommodationCosts(savedAccommodationCosts);
        
        const savedAssets = StorageManager.get('kasir_assets');
        if (savedAssets) setAssets(savedAssets);
        
        const savedAssetCategories = StorageManager.get('kasir_asset_categories');
        if (savedAssetCategories) setAssetCategories(savedAssetCategories);
        
        const savedProductCosts = StorageManager.get('kasir_product_costs');
        if (savedProductCosts) setProductCosts(savedProductCosts);
        
        const savedProductDetails = StorageManager.get('kasir_product_details');
        if (savedProductDetails) setProductDetails(savedProductDetails);
        
        const savedSuppliers = StorageManager.get('kasir_suppliers');
        if (savedSuppliers) setSuppliers(savedSuppliers);
        
        const savedStockOpname = StorageManager.get('kasir_stock_opname');
        if (savedStockOpname) setStockOpname(savedStockOpname);
        
        const savedProfitDistribution = StorageManager.get('kasir_profit_distribution');
        if (savedProfitDistribution) setProfitDistribution(savedProfitDistribution);
        
        const savedFinancialRecords = StorageManager.get('kasir_financial_records');
        if (savedFinancialRecords) setFinancialRecords(savedFinancialRecords);
        
        const savedDebts = StorageManager.get('kasir_debts');
        if (savedDebts) setDebts(savedDebts);
        
        const savedReceivables = StorageManager.get('kasir_receivables');
        if (savedReceivables) setReceivables(savedReceivables);
        
        alert('Data berhasil diimpor!');
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Gagal mengimpor data. Pastikan file yang dipilih valid.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };
  
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Export products with detailed information
    const productsWithDetails = products.map(product => {
      const details = productDetails[product.id] || {};
      const cost = productCosts[product.id] || 0;
      const profit = (product.price || 0) - cost;
      const profitMargin = (product.price || 0) > 0 ? (profit / (product.price || 0)) * 100 : 0;
      const detailedHPP = calculateDetailedHPP(product.id);
      
      return {
        ...product,
        ...details,
        cost,
        detailedHPP,
        profit,
        profitMargin
      };
    });
    const productsWs = XLSX.utils.json_to_sheet(productsWithDetails);
    XLSX.utils.book_append_sheet(wb, productsWs, 'Produk');
    
    // Export transactions
    const transactions = StorageManager.get('kasir_transactions') || [];
    const transactionsWs = XLSX.utils.json_to_sheet(transactions);
    XLSX.utils.book_append_sheet(wb, transactionsWs, 'Transaksi');
    
    // Export founder shares
    const founderSharesWs = XLSX.utils.json_to_sheet(founderShares);
    XLSX.utils.book_append_sheet(wb, founderSharesWs, 'Pembagian Founder');
    
    // Export electricity data
    const electricityVouchersWs = XLSX.utils.json_to_sheet(electricityData.vouchers);
    XLSX.utils.book_append_sheet(wb, electricityVouchersWs, 'Voucher Listrik');
    
    const electricityDevicesWs = XLSX.utils.json_to_sheet(electricityData.devices);
    XLSX.utils.book_append_sheet(wb, electricityDevicesWs, 'Perangkat Listrik');
    
    // Export employees
    const employeesWs = XLSX.utils.json_to_sheet(employees);
    XLSX.utils.book_append_sheet(wb, employeesWs, 'Karyawan');
    
    // Export work history
    const workHistoryWs = XLSX.utils.json_to_sheet(employeeWorkHistory);
    XLSX.utils.book_append_sheet(wb, workHistoryWs, 'Riwayat Kerja');
    
    // Export expenses
    const expensesWs = XLSX.utils.json_to_sheet(expenses);
    XLSX.utils.book_append_sheet(wb, expensesWs, 'Pengeluaran');
    
    // Export accommodation costs
    const accommodationCostsWs = XLSX.utils.json_to_sheet(accommodationCosts);
    XLSX.utils.book_append_sheet(wb, accommodationCostsWs, 'Biaya Akomodasi');
    
    // Export assets
    const assetsWs = XLSX.utils.json_to_sheet(assets);
    XLSX.utils.book_append_sheet(wb, assetsWs, 'Aset');
    
    // Export suppliers
    const suppliersWs = XLSX.utils.json_to_sheet(suppliers);
    XLSX.utils.book_append_sheet(wb, suppliersWs, 'Supplier');
    
    // Export stock opname
    const stockOpnameWs = XLSX.utils.json_to_sheet(stockOpname);
    XLSX.utils.book_append_sheet(wb, stockOpnameWs, 'Stock Opname');
    
    // Export financial records
    const financialRecordsWs = XLSX.utils.json_to_sheet(financialRecords);
    XLSX.utils.book_append_sheet(wb, financialRecordsWs, 'Catatan Keuangan');
    
    // Export debts
    const debtsWs = XLSX.utils.json_to_sheet(debts);
    XLSX.utils.book_append_sheet(wb, debtsWs, 'Hutang');
    
    // Export receivables
    const receivablesWs = XLSX.utils.json_to_sheet(receivables);
    XLSX.utils.book_append_sheet(wb, receivablesWs, 'Piutang');
    
    // Export profit distribution
    const profitDistributionWs = XLSX.utils.json_to_sheet([profitDistribution]);
    XLSX.utils.book_append_sheet(wb, profitDistributionWs, 'Pembagian Laba');
    
    // Save the file
    XLSX.writeFile(wb, `kasir_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  
  // Export to PDF function
  const exportFinancialReportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Laporan Keuangan', 105, 15, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`Periode: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`, 105, 25, { align: 'center' });
    
    // Financial summary
    const dailyReport = generateDailyReport();
    const monthlyReport = generateMonthlyReport();
    const yearlyReport = generateYearlyReport();
    
    // Calculate profit distribution
    const profitDistribution = calculateProfitDistribution(monthlyReport.netProfit);
    
    // Daily report
    doc.setFontSize(14);
    doc.text('Laporan Harian', 20, 40);
    doc.setFontSize(10);
    doc.text(`Tanggal: ${formatDate(dailyReport.date)}`, 20, 50);
    doc.text(`Total Penjualan: ${formatCurrency(dailyReport.totalSales)}`, 20, 55);
    doc.text(`Total HPP: ${formatCurrency(dailyReport.totalCost)}`, 20, 60);
    doc.text(`Laba Kotor: ${formatCurrency(dailyReport.grossProfit)}`, 20, 65);
    doc.text(`Pengeluaran: ${formatCurrency(dailyReport.todayExpenses)}`, 20, 70);
    doc.text(`Biaya Akomodasi: ${formatCurrency(dailyReport.todayAccommodation)}`, 20, 75);
    doc.text(`Depresiasi: ${formatCurrency(dailyReport.todayDepreciation)}`, 20, 80);
    doc.text(`Gaji Karyawan: ${formatCurrency(dailyReport.todaySalaries)}`, 20, 85);
    doc.text(`Pembayaran Hutang: ${formatCurrency(dailyReport.todayDebtPayments)}`, 20, 90);
    doc.text(`Penerimaan Piutang: ${formatCurrency(dailyReport.todayReceivableCollections)}`, 20, 95);
    doc.text(`Laba Bersih: ${formatCurrency(dailyReport.netProfit)}`, 20, 100);
    
    // Monthly report
    doc.setFontSize(14);
    doc.text('Laporan Bulanan', 20, 115);
    doc.setFontSize(10);
    doc.text(`Bulan: ${monthlyReport.month}/${monthlyReport.year}`, 20, 125);
    doc.text(`Total Penjualan: ${formatCurrency(monthlyReport.totalSales)}`, 20, 130);
    doc.text(`Total HPP: ${formatCurrency(monthlyReport.totalCost)}`, 20, 135);
    doc.text(`Laba Kotor: ${formatCurrency(monthlyReport.grossProfit)}`, 20, 140);
    doc.text(`Pengeluaran: ${formatCurrency(monthlyReport.monthlyExpenses)}`, 20, 145);
    doc.text(`Biaya Akomodasi: ${formatCurrency(monthlyReport.monthlyAccommodation)}`, 20, 150);
    doc.text(`Depresiasi: ${formatCurrency(monthlyReport.monthlyDepreciation)}`, 20, 155);
    doc.text(`Gaji Karyawan: ${formatCurrency(monthlyReport.monthlySalaries)}`, 20, 160);
    doc.text(`Pembayaran Hutang: ${formatCurrency(monthlyReport.monthlyDebtPayments)}`, 20, 165);
    doc.text(`Penerimaan Piutang: ${formatCurrency(monthlyReport.monthlyReceivableCollections)}`, 20, 170);
    doc.text(`Laba Bersih: ${formatCurrency(monthlyReport.netProfit)}`, 20, 175);
    
    // Profit distribution
    doc.setFontSize(14);
    doc.text('Pembagian Laba', 20, 190);
    doc.setFontSize(10);
    doc.text(`Total Laba Bersih: ${formatCurrency(profitDistribution.netProfit)}`, 20, 200);
    doc.text(`Bagian Usaha (${profitDistribution.businessPercentage}%): ${formatCurrency(profitDistribution.businessAmount)}`, 20, 205);
    doc.text(`Bagian Founder (${profitDistribution.founderPercentage}%): ${formatCurrency(profitDistribution.founderAmount)}`, 20, 210);
    doc.text(`Simpanan Usaha (${profitDistribution.businessSavingsPercentage}% dari bagian usaha): ${formatCurrency(profitDistribution.businessSavingsAmount)}`, 20, 215);
    
    // Founder distribution
    profitDistribution.founderShares.forEach((founder, index) => {
      doc.text(`${founder.name} (${founder.percentage.toFixed(2)}%): ${formatCurrency(founder.amount)}`, 20, 220 + (index * 5));
    });
    
    // Expense breakdown
    const expensesByCategory = calculateExpensesByCategory();
    const expenseTableData = expensesByCategory.map(item => [
      item.category,
      formatCurrency(item.amount)
    ]);
    
    doc.autoTable({
      head: [['Kategori', 'Jumlah']],
      body: expenseTableData,
      startY: 240,
      theme: 'grid'
    });
    
    // Save the PDF
    doc.save(`laporan_keuangan_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  // Generate reports
  const generateDailyReport = () => {
    const transactions = StorageManager.get('kasir_transactions') || [];
    const today = new Date().toISOString().split('T')[0];
    
    const todayTransactions = transactions.filter(transaction => 
      transaction.date && transaction.date.split('T')[0] === today
    );
    
    const totalSales = todayTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
    const totalItems = todayTransactions.reduce((sum, transaction) => 
      sum + (transaction.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0
    );
    
    // Calculate cost of goods sold (HPP)
    let totalCost = 0;
    todayTransactions.forEach(transaction => {
      if (transaction.items) {
        transaction.items.forEach(item => {
          const productCost = productCosts[item.id] || 0;
          totalCost += productCost * (item.quantity || 0);
        });
      }
    });
    
    // Get today's expenses (SEMUA pengeluaran)
    const todayExpenses = expenses.filter(expense => expense.date === today)
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    // Get today's accommodation costs
    const todayAccommodation = accommodationCosts.filter(cost => cost.date === today)
      .reduce((sum, cost) => sum + (cost.cost || 0), 0);
    
    // Get today's depreciation
    const todayDepreciation = calculateDailyDepreciation(today);
    
    // Get today's salaries
    const todaySalaries = calculateDailySalaries(today);
    
    // Get today's debt payments
    const todayDebtPayments = debts.filter(d => d.date === today && d.status === 'paid')
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Get today's receivable collections
    const todayReceivableCollections = receivables.filter(r => r.date === today && r.status === 'paid')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Calculate gross profit and net profit
    const grossProfit = totalSales - totalCost;
    const netProfit = grossProfit - todayExpenses - todayAccommodation - todayDepreciation - todaySalaries - todayDebtPayments + todayReceivableCollections;
    
    // Get today's financial records
    const todayFinancialRecords = financialRecords.filter(record => record.date === today);
    
    // Calculate today's profit distribution
    const profitDistribution = netProfit > 0 ? calculateProfitDistribution(netProfit) : null;
    
    return {
      date: today,
      transactionCount: todayTransactions.length,
      totalSales,
      totalItems,
      totalCost,
      grossProfit,
      todayExpenses,
      todayAccommodation,
      todayDepreciation,
      todaySalaries,
      todayDebtPayments,
      todayReceivableCollections,
      netProfit,
      transactions: todayTransactions,
      financialRecords: todayFinancialRecords,
      profitDistribution
    };
  };
  
  const generateMonthlyReport = () => {
    const transactions = StorageManager.get('kasir_transactions') || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTransactions = transactions.filter(transaction => {
      if (!transaction.date) return false;
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
    
    const totalSales = monthlyTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
    const totalItems = monthlyTransactions.reduce((sum, transaction) => 
      sum + (transaction.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0
    );
    
    // Calculate cost of goods sold (HPP)
    let totalCost = 0;
    monthlyTransactions.forEach(transaction => {
      if (transaction.items) {
        transaction.items.forEach(item => {
          const productCost = productCosts[item.id] || 0;
          totalCost += productCost * (item.quantity || 0);
        });
      }
    });
    
    // Get monthly expenses (SEMUA pengeluaran)
    const monthlyExpenses = expenses.filter(expense => {
      if (!expense.date) return false;
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    }).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    // Get monthly accommodation costs
    const monthlyAccommodation = accommodationCosts.filter(cost => {
      if (!cost.date) return false;
      const costDate = new Date(cost.date);
      return costDate.getMonth() === currentMonth && 
             costDate.getFullYear() === currentYear;
    }).reduce((sum, cost) => sum + (cost.cost || 0), 0);
    
    // Get monthly depreciation
    const monthlyDepreciation = calculateMonthlyDepreciation(currentYear, currentMonth);
    
    // Get monthly salaries
    const monthlySalaries = calculateMonthlySalaries(currentYear, currentMonth);
    
    // Get monthly debt payments
    const monthlyDebtPayments = debts.filter(d => {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      return dDate.getMonth() === currentMonth && 
             dDate.getFullYear() === currentYear && d.status === 'paid';
    }).reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Get monthly receivable collections
    const monthlyReceivableCollections = receivables.filter(r => {
      if (!r.date) return false;
      const rDate = new Date(r.date);
      return rDate.getMonth() === currentMonth && 
             rDate.getFullYear() === currentYear && r.status === 'paid';
    }).reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Calculate gross profit and net profit
    const grossProfit = totalSales - totalCost;
    const netProfit = grossProfit - monthlyExpenses - monthlyAccommodation - monthlyDepreciation - monthlySalaries - monthlyDebtPayments + monthlyReceivableCollections;
    
    // Get monthly financial records
    const monthlyFinancialRecords = financialRecords.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === currentMonth && 
             recordDate.getFullYear() === currentYear;
    });
    
    // Calculate monthly profit distribution
    const profitDistribution = netProfit > 0 ? calculateProfitDistribution(netProfit) : null;
    
    // Group by day
    const dailyData = {};
    monthlyTransactions.forEach(transaction => {
      if (!transaction.date) return;
      const day = transaction.date.split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          totalSales: 0,
          totalCost: 0,
          transactionCount: 0
        };
      }
      dailyData[day].totalSales += transaction.total || 0;
      dailyData[day].transactionCount += 1;
      
      // Add cost for this day
      if (transaction.items) {
        transaction.items.forEach(item => {
          const productCost = productCosts[item.id] || 0;
          dailyData[day].totalCost += productCost * (item.quantity || 0);
        });
      }
    });
    
    // Calculate profit for each day
    Object.keys(dailyData).forEach(day => {
      const dayExpenses = expenses.filter(expense => expense.date === day)
        .reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      const dayAccommodation = accommodationCosts.filter(cost => cost.date === day)
        .reduce((sum, cost) => sum + (cost.cost || 0), 0);
      
      const dayDepreciation = calculateDailyDepreciation(day);
      
      const daySalaries = calculateDailySalaries(day);
      
      const dayDebtPayments = debts.filter(d => d.date === day && d.status === 'paid')
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      
      const dayReceivableCollections = receivables.filter(r => r.date === day && r.status === 'paid')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      dailyData[day].grossProfit = dailyData[day].totalSales - dailyData[day].totalCost;
      dailyData[day].netProfit = dailyData[day].grossProfit - dayExpenses - dayAccommodation - dayDepreciation - daySalaries - dayDebtPayments + dayReceivableCollections;
    });
    
    return {
      month: currentMonth + 1,
      year: currentYear,
      transactionCount: monthlyTransactions.length,
      totalSales,
      totalItems,
      totalCost,
      grossProfit,
      monthlyExpenses,
      monthlyAccommodation,
      monthlyDepreciation,
      monthlySalaries,
      monthlyDebtPayments,
      monthlyReceivableCollections,
      netProfit,
      financialRecords: monthlyFinancialRecords,
      profitDistribution,
      dailyData: Object.values(dailyData)
    };
  };
  
  const generateYearlyReport = () => {
    const transactions = StorageManager.get('kasir_transactions') || [];
    const currentYear = new Date().getFullYear();
    
    const yearlyTransactions = transactions.filter(transaction => {
      if (!transaction.date) return false;
      const transactionDate = new Date(transaction.date);
      return transactionDate.getFullYear() === currentYear;
    });
    
    const totalSales = yearlyTransactions.reduce((sum, transaction) => sum + (transaction.total || 0), 0);
    const totalItems = yearlyTransactions.reduce((sum, transaction) => 
      sum + (transaction.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0
    );
    
    // Calculate cost of goods sold (HPP)
    let totalCost = 0;
    yearlyTransactions.forEach(transaction => {
      if (transaction.items) {
        transaction.items.forEach(item => {
          const productCost = productCosts[item.id] || 0;
          totalCost += productCost * (item.quantity || 0);
        });
      }
    });
    
    // Get yearly expenses (SEMUA pengeluaran)
    const yearlyExpenses = expenses.filter(expense => {
      if (!expense.date) return false;
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === currentYear;
    }).reduce((sum, expense) => sum + (expense.amount || 0), 0);
    
    // Get yearly accommodation costs
    const yearlyAccommodation = accommodationCosts.filter(cost => {
      if (!cost.date) return false;
      const costDate = new Date(cost.date);
      return costDate.getFullYear() === currentYear;
    }).reduce((sum, cost) => sum + (cost.cost || 0), 0);
    
    // Get yearly depreciation
    const yearlyDepreciation = calculateYearlyDepreciation(currentYear);
    
    // Get yearly salaries
    const yearlySalaries = calculateYearlySalaries(currentYear);
    
    // Get yearly debt payments
    const yearlyDebtPayments = debts.filter(d => {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      return dDate.getFullYear() === currentYear && d.status === 'paid';
    }).reduce((sum, d) => sum + (d.amount || 0), 0);
    
    // Get yearly receivable collections
    const yearlyReceivableCollections = receivables.filter(r => {
      if (!r.date) return false;
      const rDate = new Date(r.date);
      return rDate.getFullYear() === currentYear && r.status === 'paid';
    }).reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Calculate gross profit and net profit
    const grossProfit = totalSales - totalCost;
    const netProfit = grossProfit - yearlyExpenses - yearlyAccommodation - yearlyDepreciation - yearlySalaries - yearlyDebtPayments + yearlyReceivableCollections;
    
    // Get yearly financial records
    const yearlyFinancialRecords = financialRecords.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === currentYear;
    });
    
    // Calculate yearly profit distribution
    const profitDistribution = netProfit > 0 ? calculateProfitDistribution(netProfit) : null;
    
    // Group by month
    const monthlyData = {};
    yearlyTransactions.forEach(transaction => {
      if (!transaction.date) return;
      const transactionDate = new Date(transaction.date);
      const month = transactionDate.getMonth() + 1;
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          totalSales: 0,
          totalCost: 0,
          transactionCount: 0
        };
      }
      monthlyData[month].totalSales += transaction.total || 0;
      monthlyData[month].transactionCount += 1;
      
      // Add cost for this month
      if (transaction.items) {
        transaction.items.forEach(item => {
          const productCost = productCosts[item.id] || 0;
          monthlyData[month].totalCost += productCost * (item.quantity || 0);
        });
      }
    });
    
    // Calculate profit for each month
    Object.keys(monthlyData).forEach(month => {
      const monthExpenses = expenses.filter(expense => {
        if (!expense.date) return false;
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() == (month - 1) && 
               expenseDate.getFullYear() === currentYear;
      }).reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      const monthAccommodation = accommodationCosts.filter(cost => {
        if (!cost.date) return false;
        const costDate = new Date(cost.date);
        return costDate.getMonth() == (month - 1) && 
               costDate.getFullYear() === currentYear;
      }).reduce((sum, cost) => sum + (cost.cost || 0), 0);
      
      const monthDepreciation = calculateMonthlyDepreciation(currentYear, month - 1);
      
      const monthSalaries = calculateMonthlySalaries(currentYear, month - 1);
      
      const monthDebtPayments = debts.filter(d => {
        if (!d.date) return false;
        const dDate = new Date(d.date);
        return dDate.getMonth() == (month - 1) && 
               dDate.getFullYear() === currentYear && d.status === 'paid';
      }).reduce((sum, d) => sum + (d.amount || 0), 0);
      
      const monthReceivableCollections = receivables.filter(r => {
        if (!r.date) return false;
        const rDate = new Date(r.date);
        return rDate.getMonth() == (month - 1) && 
               rDate.getFullYear() === currentYear && r.status === 'paid';
      }).reduce((sum, r) => sum + (r.amount || 0), 0);
      
      monthlyData[month].grossProfit = monthlyData[month].totalSales - monthlyData[month].totalCost;
      monthlyData[month].netProfit = monthlyData[month].grossProfit - monthExpenses - monthAccommodation - monthDepreciation - monthSalaries - monthDebtPayments + monthReceivableCollections;
    });
    
    return {
      year: currentYear,
      transactionCount: yearlyTransactions.length,
      totalSales,
      totalItems,
      totalCost,
      grossProfit,
      yearlyExpenses,
      yearlyAccommodation,
      yearlyDepreciation,
      yearlySalaries,
      yearlyDebtPayments,
      yearlyReceivableCollections,
      netProfit,
      financialRecords: yearlyFinancialRecords,
      profitDistribution,
      monthlyData: Object.values(monthlyData)
    };
  };
  
  const dailyReport = generateDailyReport();
  const monthlyReport = generateMonthlyReport();
  const yearlyReport = generateYearlyReport();
  const monthlyExpenseReport = generateMonthlyExpenseReport();
  const expensesByCategory = calculateExpensesByCategory();
  
  // Form states
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: 0, 
    stock: 0,
    category: '',
    description: '',
    unit: 'pcs',
    weight: 0,
    weightUnit: 'gram',
    cost: 0,
    supplier: '',
    minStock: 0
  });
  const [newVoucher, setNewVoucher] = useState({ date: new Date().toISOString().split('T')[0], amount: 0 });
  const [newDevice, setNewDevice] = useState({ name: '', watt: 0, hours: 24 });
  const [newEmployee, setNewEmployee] = useState({ 
    name: '', 
    position: '', 
    employmentType: 'full_time',
    baseSalary: 0, 
    allowances: 0, 
    deductions: 0,
    hourlyRate: 0
  });
  
  // Sidebar navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'kasir', label: 'Kasir Utama', icon: '💰' },
    { id: 'produk', label: 'Daftar Produk', icon: '📦' },
    { id: 'supplier', label: 'Daftar Supplier', icon: '📋' },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: '💸' },
    { id: 'akomodasi', label: 'Biaya Akomodasi', icon: '🚚' },
    { id: 'aset', label: 'Aset & Depresiasi', icon: '🏢' },
    { id: 'listrik', label: 'Manajemen Listrik', icon: '⚡' },
    { id: 'sdm', label: 'SDM & Gaji', icon: '👥' },
    { id: 'founder', label: 'Founder Share', icon: '🤝' },
    { id: 'hutangpiutang', label: 'Hutang & Piutang', icon: '💳' },
    { id: 'laporan', label: 'Laporan', icon: '📈' }
  ];
  
  // Show loading state if data is not loaded yet
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">Memuat data aplikasi...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Cashier Apps V1</h1>
        <button 
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Sidebar - Hidden on mobile when menu is closed */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-white shadow-md flex flex-col z-10 fixed md:static inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-4 border-b border-gray-200 hidden md:block">
          <h1 className="text-xl font-bold text-gray-800">Cashier Apps V1</h1>
          <p className="text-sm text-gray-600">Create By Sean Michael 2025</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto mt-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full flex items-center px-4 py-3 text-left transition ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false); // Close menu after selection on mobile
                  }}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Penyimpanan</label>
            <select 
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
            >
              <option value="localStorage">Local Storage</option>
              <option value="indexedDB">IndexedDB</option>
              <option value="external">External Storage</option>
            </select>
          </div>
          
          <div className="flex gap-2 mb-3">
            <button 
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md transition text-sm"
              onClick={exportToJSON}
            >
              Export JSON
            </button>
            <button 
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-md transition text-sm"
              onClick={exportToExcel}
            >
              Export Excel
            </button>
            <label className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-md transition cursor-pointer text-center">
              Import
              <input 
                type="file" 
                className="hidden" 
                accept=".json" 
                onChange={importFromJSON}
              />
            </label>
          </div>
          
          <button 
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-md transition text-sm"
            onClick={resetAllData}
          >
            Reset Semua Data
          </button>
        </div>
      </div>
      
      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <div className="flex items-center">
                      <div className="rounded-full bg-blue-100 p-3 mr-4">
                        <span className="text-blue-600 text-xl">💰</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Penjualan Hari Ini</p>
                        <p className="text-2xl font-bold">{formatCurrency(dailyReport.totalSales)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <div className="flex items-center">
                      <div className="rounded-full bg-green-100 p-3 mr-4">
                        <span className="text-green-600 text-xl">📈</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Laba Hari Ini</p>
                        <p className={`text-2xl font-bold ${dailyReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(dailyReport.netProfit)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <div className="flex items-center">
                      <div className="rounded-full bg-purple-100 p-3 mr-4">
                        <span className="text-purple-600 text-xl">📦</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Produk</p>
                        <p className="text-2xl font-bold">{products.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <div className="flex items-center">
                      <div className="rounded-full bg-yellow-100 p-3 mr-4">
                        <span className="text-yellow-600 text-xl">⚠️</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Stok Menipis</p>
                        <p className="text-2xl font-bold">
                          {products.filter(p => {
                            const details = productDetails[p.id] || {};
                            return (p.stock || 0) <= (details.minStock || 0);
                          }).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-medium mb-4">Tren Penjualan</h3>
                    <div className="h-64">
                      <canvas ref={salesChartRef}></canvas>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-medium mb-4">Laba/Rugi</h3>
                    <div className="h-64">
                      <canvas ref={profitChartRef}></canvas>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-medium mb-4">Stok Produk Tertinggi</h3>
                    <div className="h-64">
                      <canvas ref={stockChartRef}></canvas>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-medium mb-4">Produk Stok Menipis</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minimal</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {products
                            .filter(p => {
                              const details = productDetails[p.id] || {};
                              return (p.stock || 0) <= (details.minStock || 0);
                            })
                            .slice(0, 5)
                            .map(product => {
                              const details = productDetails[product.id] || {};
                              return (
                                <tr key={product.id}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {product.name}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">
                                    {product.stock || 0} {details.unit || 'pcs'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {details.minStock || 0} {details.unit || 'pcs'}
                                  </td>
                                </tr>
                              );
                            })}
                          {products.filter(p => {
                            const details = productDetails[p.id] || {};
                            return (p.stock || 0) <= (details.minStock || 0);
                          }).length === 0 && (
                            <tr>
                              <td colSpan="3" className="px-4 py-4 text-center text-sm text-gray-500">
                                Tidak ada produk dengan stok menipis
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Recent Stock Opname History */}
                <div className="mt-8 bg-white p-4 rounded-lg shadow border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Riwayat Stock Opname</h3>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                      onClick={startStockOpname}
                    >
                      Mulai Stock Opname
                    </button>
                  </div>
                  
                  {newStockOpname.items.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                        <input
                          type="date"
                          className="w-full rounded-md border border-gray-300 py-2 px-3"
                          value={newStockOpname.date}
                          onChange={(e) => setNewStockOpname({...newStockOpname, date: e.target.value})}
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-1">Catatan</label>
                        <textarea
                          className="w-full rounded-md border border-gray-300 py-2 px-3"
                          value={newStockOpname.notes}
                          onChange={(e) => setNewStockOpname({...newStockOpname, notes: e.target.value})}
                          rows={2}
                        />
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Sistem</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Aktual</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selisih</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {newStockOpname.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {item.productName}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {item.systemStock || 0}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-20 rounded-md border border-gray-300 py-1 px-2 text-sm"
                                    value={item.actualStock || 0}
                                    onChange={(e) => updateStockOpnameItem(index, 'actualStock', Number(e.target.value))}
                                  />
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                  <span className={item.difference !== 0 ? 'font-medium text-red-600' : ''}>
                                    {item.difference !== 0 ? (item.difference > 0 ? '+' : '') : ''}
                                    {item.difference || 0}
                                  </span>
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <input
                                    type="text"
                                    className="w-full rounded-md border border-gray-300 py-1 px-2 text-sm"
                                    value={item.notes || ''}
                                    onChange={(e) => updateStockOpnameItem(index, 'notes', e.target.value)}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                          onClick={saveStockOpname}
                        >
                          Simpan Stock Opname
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Produk</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockOpname.slice(-5).map(opname => {
                          const totalDifference = opname.items.reduce((sum, item) => sum + Math.abs(item.difference || 0), 0);
                          return (
                            <tr key={opname.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(opname.date)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {opname.notes || '-'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {opname.items.length}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {totalDifference}
                              </td>
                            </tr>
                          );
                        })}
                        {stockOpname.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-4 py-4 text-center text-sm text-gray-500">
                              Belum ada riwayat stock opname
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Profit Distribution Summary */}
                {dailyReport.profitDistribution && (
                  <div className="mt-8 bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-medium mb-4">Pembagian Laba Hari Ini</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-md">
                        <div className="text-sm text-blue-600 mb-1">Bagian Usaha</div>
                        <div className="text-xl font-bold text-blue-800">
                          {formatCurrency(dailyReport.profitDistribution.businessAmount)}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {profitDistribution.businessPercentage}% dari laba bersih
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-md">
                        <div className="text-sm text-green-600 mb-1">Simpanan Usaha</div>
                        <div className="text-xl font-bold text-green-800">
                          {formatCurrency(dailyReport.profitDistribution.businessSavingsAmount)}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {profitDistribution.businessSavingsPercentage}% dari bagian usaha
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-md">
                        <div className="text-sm text-purple-600 mb-1">Bagian Founder</div>
                        <div className="text-xl font-bold text-purple-800">
                          {formatCurrency(dailyReport.profitDistribution.founderAmount)}
                        </div>
                        <div className="text-xs text-purple-600 mt-1">
                          {profitDistribution.founderPercentage}% dari laba bersih
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Rincian Pembagian Founder</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {dailyReport.profitDistribution.founderShares.map((founder, index) => (
                          <div key={index} className="bg-white p-3 rounded-md shadow-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{founder.name}</span>
                              <span>{formatCurrency(founder.amount)}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {founder.percentage.toFixed(2)}% dari bagian founder
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Kasir Utama Tab */}
            {activeTab === 'kasir' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Kasir Utama</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Product List */}
                  <div className="lg:col-span-2">
                    <h3 className="font-medium mb-4">Daftar Produk</h3>
                    
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari produk..."
                          className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                          🔍
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {products.map((product) => {
                            const details = productDetails[product.id] || {};
                            const cost = productCosts[product.id] || 0;
                            const profit = (product.price || 0) - cost;
                            
                            // Check if stock is low
                            const isLowStock = (product.stock || 0) <= (details.minStock || 0);
                            
                            return (
                              <tr key={product.id} className={isLowStock ? 'bg-yellow-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {product.image ? (
                                    <img src={product.image} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-500 text-xs">No Image</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-xs text-gray-500">{details.category || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatCurrency(product.price || 0)}</div>
                                  <div className="text-xs text-gray-500">
                                    HPP: {formatCurrency(cost)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                    {product.stock || 0} {details.unit || 'pcs'}
                                  </div>
                                  {isLowStock && (
                                    <div className="text-xs text-red-500">Stok rendah!</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md transition"
                                    onClick={() => addToCart(product)}
                                    disabled={(product.stock || 0) <= 0}
                                  >
                                    {(product.stock || 0) > 0 ? 'Tambah' : 'Habis'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Cart */}
                  <div>
                    <h3 className="font-medium mb-4">Keranjang Belanja</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      {cart.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Keranjang kosong</p>
                      ) : (
                        <div className="space-y-3">
                          {cart.map((item) => {
                            const details = productDetails[item.id] || {};
                            const cost = productCosts[item.id] || 0;
                            const profit = ((item.price || 0) - cost) * (item.quantity || 0);
                            
                            return (
                              <div key={item.id} className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {formatCurrency((item.price || 0) * (item.quantity || 0))} x {item.quantity || 0} {details.unit || 'pcs'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    HPP: {formatCurrency(cost)} | Laba: {formatCurrency(profit)}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <button
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() => updateCartItemQuantity(item.id, (item.quantity || 0) - 1)}
                                  >
                                    -
                                  </button>
                                  <span className="mx-2">{item.quantity || 0}</span>
                                  <button
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() => updateCartItemQuantity(item.id, (item.quantity || 0) + 1)}
                                  >
                                    +
                                  </button>
                                  <button
                                    className="ml-2 text-red-500 hover:text-red-700"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          
                          <div className="border-t border-gray-200 pt-3 mt-3">
                            <div className="flex justify-between mb-2">
                              <span>Subtotal:</span>
                              <span>{formatCurrency(cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0))}</span>
                            </div>
                            
                            <div className="flex justify-between mb-2">
                              <span>Total HPP:</span>
                              <span>{formatCurrency(cart.reduce((sum, item) => {
                                const cost = productCosts[item.id] || 0;
                                return sum + (cost * (item.quantity || 0));
                              }, 0))}</span>
                            </div>
                            
                            <div className="flex justify-between mb-2">
                              <span>Laba Kotor:</span>
                              <span>{formatCurrency(cart.reduce((sum, item) => {
                                const cost = productCosts[item.id] || 0;
                                return sum + (((item.price || 0) - cost) * (item.quantity || 0));
                              }, 0))}</span>
                            </div>
                            
                            <div className="flex justify-between items-center mb-2">
                              <span>Diskon (%):</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-20 rounded-md border border-gray-300 py-1 px-2 text-right"
                                value={discount}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                              />
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Total:</span>
                              <span>{formatCurrency(calculateTotal())}</span>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-200 pt-3 mt-3">
                            <div className="flex justify-between items-center mb-2">
                              <span>Bayar:</span>
                              <input
                                type="number"
                                min="0"
                                className="w-32 rounded-md border border-gray-300 py-1 px-2 text-right"
                                value={customerMoney}
                                onChange={(e) => setCustomerMoney(Number(e.target.value))}
                              />
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Kembali:</span>
                              <span>{formatCurrency(calculateChange())}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <button
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                              onClick={processSale}
                            >
                              Proses
                            </button>
                            <button
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition"
                              onClick={printReceipt}
                            >
                              Cetak Struk
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Produk Tab */}
            {activeTab === 'produk' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Manajemen Produk</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4">Tambah Produk Baru</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Nama Produk</label>
                          <input
                            type="text"
                            placeholder="Nama Produk"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Kategori</label>
                          <input
                            type="text"
                            placeholder="Kategori Produk"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.category}
                            onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Supplier</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.supplier}
                            onChange={(e) => setNewProduct({...newProduct, supplier: e.target.value})}
                          >
                            <option value="">Pilih Supplier</option>
                            {suppliers.map(supplier => (
                              <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Harga Jual (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newProduct.price)}
                            onChange={(e) => setNewProduct({...newProduct, price: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Stok</label>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Stok Minimal</label>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.minStock}
                            onChange={(e) => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Satuan</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.unit}
                            onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                          >
                            <option value="pcs">Pcs</option>
                            <option value="kg">Kg</option>
                            <option value="gram">Gram</option>
                            <option value="liter">Liter</option>
                            <option value="ml">Ml</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Berat</label>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.weight}
                            onChange={(e) => setNewProduct({...newProduct, weight: Number(e.target.value)})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Satuan Berat</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.weightUnit}
                            onChange={(e) => setNewProduct({...newProduct, weightUnit: e.target.value})}
                          >
                            <option value="gram">Gram</option>
                            <option value="kg">Kg</option>
                            <option value="mg">Mg</option>
                          </select>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Harga Pokok (HPP) (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newProduct.cost || 0)}
                            onChange={(e) => setNewProduct({...newProduct, cost: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                          <textarea
                            placeholder="Deskripsi produk"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                            rows={3}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Biaya Tambahan</label>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Packaging</label>
                              <input
                                type="text"
                                placeholder="0"
                                className="w-full rounded-md border border-gray-300 py-1 px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formatCurrencyInput(newProduct.packagingCost || 0)}
                                onChange={(e) => setNewProduct({...newProduct, packagingCost: parseCurrencyInput(e.target.value)})}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Processing</label>
                              <input
                                type="text"
                                placeholder="0"
                                className="w-full rounded-md border border-gray-300 py-1 px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formatCurrencyInput(newProduct.processingCost || 0)}
                                onChange={(e) => setNewProduct({...newProduct, processingCost: parseCurrencyInput(e.target.value)})}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Lainnya</label>
                              <input
                                type="text"
                                placeholder="0"
                                className="w-full rounded-md border border-gray-300 py-1 px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formatCurrencyInput(newProduct.otherCosts || 0)}
                                onChange={(e) => setNewProduct({...newProduct, otherCosts: parseCurrencyInput(e.target.value)})}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Gambar Produk</label>
                          <div className="flex items-center space-x-4">
                            {newProductImage ? (
                              <img src={newProductImage} alt="Preview" className="h-16 w-16 rounded-md object-cover" />
                            ) : (
                              <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                            <label className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition cursor-pointer">
                              Pilih Gambar
                              <input 
                                type="file" 
                                ref={newProductImageRef}
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleNewProductImageUpload}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <h4 className="font-medium text-sm text-blue-800 mb-2">Perhitungan HPP Detail</h4>
                        <div className="text-xs text-gray-700 space-y-1">
                          <div className="flex justify-between">
                            <span>Harga Pokok Dasar:</span>
                            <span>{formatCurrency(newProduct.cost || 0)}</span>
                          </div>
                          {newProduct.weight && (
                            <div className="flex justify-between">
                              <span>Harga per {newProduct.weightUnit}:</span>
                              <span>
                                {newProduct.weight > 0 
                                  ? formatCurrency((newProduct.cost || 0) / newProduct.weight) 
                                  : formatCurrency(0)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Biaya Packaging:</span>
                            <span>{formatCurrency(newProduct.packagingCost || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Biaya Processing:</span>
                            <span>{formatCurrency(newProduct.processingCost || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Biaya Lainnya:</span>
                            <span>{formatCurrency(newProduct.otherCosts || 0)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t border-blue-200 pt-1 mt-1">
                            <span>Total HPP:</span>
                            <span>
                              {formatCurrency(
                                (newProduct.cost || 0) + 
                                (newProduct.packagingCost || 0) + 
                                (newProduct.processingCost || 0) + 
                                (newProduct.otherCosts || 0)
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Laba per Unit:</span>
                            <span className={newProduct.price > ((newProduct.cost || 0) + (newProduct.packagingCost || 0) + (newProduct.processingCost || 0) + (newProduct.otherCosts || 0)) ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(
                                newProduct.price - 
                                ((newProduct.cost || 0) + 
                                (newProduct.packagingCost || 0) + 
                                (newProduct.processingCost || 0) + 
                                (newProduct.otherCosts || 0))
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition w-full"
                        onClick={() => {
                          if (newProduct.name && newProduct.price > 0) {
                            const productWithId = {...newProduct, id: Date.now(), image: newProductImage};
                            setProducts([...products, productWithId]);
                            
                            // Save product cost
                            const totalCost = (newProduct.cost || 0) + 
                                            (newProduct.packagingCost || 0) + 
                                            (newProduct.processingCost || 0) + 
                                            (newProduct.otherCosts || 0);
                            updateProductCost(productWithId.id, totalCost);
                            
                            // Save product details
                            updateProductDetail(productWithId.id, 'category', newProduct.category);
                            updateProductDetail(productWithId.id, 'description', newProduct.description);
                            updateProductDetail(productWithId.id, 'unit', newProduct.unit);
                            updateProductDetail(productWithId.id, 'weight', newProduct.weight);
                            updateProductDetail(productWithId.id, 'weightUnit', newProduct.weightUnit);
                            updateProductDetail(productWithId.id, 'supplier', newProduct.supplier);
                            updateProductDetail(productWithId.id, 'minStock', newProduct.minStock);
                            updateProductDetail(productWithId.id, 'packagingCost', newProduct.packagingCost || 0);
                            updateProductDetail(productWithId.id, 'processingCost', newProduct.processingCost || 0);
                            updateProductDetail(productWithId.id, 'otherCosts', newProduct.otherCosts || 0);
                            
                            resetNewProductForm();
                            alert('Produk berhasil ditambahkan!');
                          }
                        }}
                      >
                        Tambah Produk
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Daftar Produk</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Jual</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HPP</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Laba</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {products.map((product) => {
                            const details = productDetails[product.id] || {};
                            const cost = productCosts[product.id] || 0;
                            const profit = (product.price || 0) - cost;
                            const profitMargin = (product.price || 0) > 0 ? (profit / (product.price || 0)) * 100 : 0;
                            
                            // Check if stock is low
                            const isLowStock = (product.stock || 0) <= (details.minStock || 0);
                            
                            return (
                              <tr key={product.id} className={isLowStock ? 'bg-yellow-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {product.image ? (
                                    <img src={product.image} alt={product.name} className="h-10 w-10 rounded-md object-cover" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                      <span className="text-gray-500 text-xs">No Image</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-xs text-gray-500">{details.supplier || 'No supplier'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{details.category || '-'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatCurrency(product.price || 0)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatCurrency(cost)}</div>
                                  {details.weight && (
                                    <div className="text-xs text-gray-500">
                                      {formatCurrency(cost / details.weight)}/{details.weightUnit}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(profit)} ({profitMargin.toFixed(1)}%)
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                    {product.stock || 0} {details.unit || 'pcs'}
                                  </div>
                                  {isLowStock && (
                                    <div className="text-xs text-red-500">Stok rendah!</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    className="text-yellow-600 hover:text-yellow-900 mr-3"
                                    onClick={() => startEditingProduct(product)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-900"
                                    onClick={() => setProducts(products.filter(p => p.id !== product.id))}
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Edit Product Modal */}
                {editingProduct && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                      <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium">Edit Produk</h3>
                          <button
                            className="text-gray-500 hover:text-gray-700"
                            onClick={cancelEditingProduct}
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                            <input
                              type="text"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editingProduct.name}
                              onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <input
                              type="text"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productDetails[editingProduct.id]?.category || ''}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'category', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                            <select
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productDetails[editingProduct.id]?.supplier || ''}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'supplier', e.target.value)}
                            >
                              <option value="">Pilih Supplier</option>
                              {suppliers.map(supplier => (
                                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual</label>
                            <input
                              type="text"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={formatCurrencyInput(editingProduct.price)}
                              onChange={(e) => setEditingProduct({...editingProduct, price: parseCurrencyInput(e.target.value)})}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stok</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editingProduct.stock}
                              onChange={(e) => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stok Minimal</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productDetails[editingProduct.id]?.minStock || 0}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'minStock', Number(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                            <select
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productDetails[editingProduct.id]?.unit || 'pcs'}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'unit', e.target.value)}
                            >
                              <option value="pcs">Pcs</option>
                              <option value="kg">Kg</option>
                              <option value="gram">Gram</option>
                              <option value="liter">Liter</option>
                              <option value="ml">Ml</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Berat</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productDetails[editingProduct.id]?.weight || 0}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'weight', Number(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan Berat</label>
                            <select
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productDetails[editingProduct.id]?.weightUnit || 'gram'}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'weightUnit', e.target.value)}
                            >
                              <option value="gram">Gram</option>
                              <option value="kg">Kg</option>
                              <option value="mg">Mg</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Pokok (HPP)</label>
                            <input
                              type="text"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={formatCurrencyInput(productCosts[editingProduct.id] || 0)}
                              onChange={(e) => updateProductCost(editingProduct.id, parseCurrencyInput(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Packaging</label>
                            <input
                              type="text"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={formatCurrencyInput(productDetails[editingProduct.id]?.packagingCost || 0)}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'packagingCost', parseCurrencyInput(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Processing</label>
                            <input
                              type="text"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={formatCurrencyInput(productDetails[editingProduct.id]?.processingCost || 0)}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'processingCost', parseCurrencyInput(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Lainnya</label>
                            <input
                              type="text"
                              min="0"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={formatCurrencyInput(productDetails[editingProduct.id]?.otherCosts || 0)}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'otherCosts', parseCurrencyInput(e.target.value))}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                            <textarea
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={productDetails[editingProduct.id]?.description || ''}
                              onChange={(e) => updateProductDetail(editingProduct.id, 'description', e.target.value)}
                              rows={3}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Produk</label>
                            <div className="flex items-center space-x-4">
                              {editingProduct.image ? (
                                <img src={editingProduct.image} alt={editingProduct.name} className="h-16 w-16 rounded-md object-cover" />
                              ) : (
                                <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-500 text-xs">No Image</span>
                                </div>
                              )}
                              <label className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition cursor-pointer">
                                Pilih Gambar
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={handleProductImageUpload}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 p-4 bg-blue-50 rounded-md">
                          <h4 className="font-medium text-blue-800 mb-2">Perhitungan HPP & Laba</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="flex justify-between">
                                <span>Harga Pokok Dasar:</span>
                                <span>{formatCurrency(productCosts[editingProduct.id] || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Biaya Packaging:</span>
                                <span>{formatCurrency(productDetails[editingProduct.id]?.packagingCost || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Biaya Processing:</span>
                                <span>{formatCurrency(productDetails[editingProduct.id]?.processingCost || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Biaya Lainnya:</span>
                                <span>{formatCurrency(productDetails[editingProduct.id]?.otherCosts || 0)}</span>
                              </div>
                              <div className="flex justify-between font-medium border-t border-blue-200 pt-1 mt-1">
                                <span>Total HPP:</span>
                                <span>{formatCurrency(calculateDetailedHPP(editingProduct.id))}</span>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between">
                                <span>Harga Jual:</span>
                                <span>{formatCurrency(editingProduct.price)}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Laba per Unit:</span>
                                <span className={editingProduct.price > calculateDetailedHPP(editingProduct.id) ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(editingProduct.price - calculateDetailedHPP(editingProduct.id))}
                                </span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Margin Laba:</span>
                                <span className={editingProduct.price > calculateDetailedHPP(editingProduct.id) ? 'text-green-600' : 'text-red-600'}>
                                  {editingProduct.price > 0 
                                    ? `${(((editingProduct.price - calculateDetailedHPP(editingProduct.id)) / editingProduct.price) * 100).toFixed(1)}%` 
                                    : '0%'}
                                </span>
                              </div>
                              {productDetails[editingProduct.id]?.weight && (
                                <div className="flex justify-between text-xs text-gray-600 mt-2">
                                  <span>Harga per {productDetails[editingProduct.id].weightUnit}:</span>
                                  <span>
                                    {productDetails[editingProduct.id].weight > 0 
                                      ? formatCurrency(calculateDetailedHPP(editingProduct.id) / productDetails[editingProduct.id].weight) 
                                      : formatCurrency(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                          <button
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            onClick={cancelEditingProduct}
                          >
                            Batal
                          </button>
                          <button
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            onClick={saveEditedProduct}
                          >
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Supplier Tab */}
            {activeTab === 'supplier' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Daftar Supplier</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4">Tambah Supplier Baru</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nama Supplier</label>
                          <input
                            type="text"
                            placeholder="Nama Supplier"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newSupplier.name}
                            onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Kontak</label>
                          <input
                            type="text"
                            placeholder="Nama Kontak"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newSupplier.contact}
                            onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Telepon</label>
                          <input
                            type="text"
                            placeholder="Nomor Telepon"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newSupplier.phone}
                            onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Email</label>
                          <input
                            type="email"
                            placeholder="Email"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newSupplier.email}
                            onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Alamat</label>
                          <textarea
                            placeholder="Alamat Lengkap"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newSupplier.address}
                            onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                            rows={3}
                          />
                        </div>
                      </div>
                      
                      <button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={addSupplier}
                      >
                        Tambah Supplier
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Daftar Supplier</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontak</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telepon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {suppliers.map((supplier) => (
                            <tr key={supplier.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                                <div className="text-xs text-gray-500">{supplier.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{supplier.contact}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{supplier.phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeSupplier(supplier.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Expenses Tab */}
            {activeTab === 'pengeluaran' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Pengeluaran</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Catat Pengeluaran</h3>
                      <button
                        className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md transition"
                        onClick={() => {
                          setShowCategoryManagement(true);
                          setCategoryType('expense');
                        }}
                      >
                        Kelola Kategori
                      </button>
                    </div>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Kategori</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newExpense.category}
                            onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                          >
                            <option value="">Pilih Kategori</option>
                            {expenseCategories.map((category, index) => (
                              <option key={index} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newExpense.date}
                            onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                          <input
                            type="text"
                            placeholder="Deskripsi pengeluaran"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newExpense.description}
                            onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jumlah (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newExpense.amount)}
                            onChange={(e) => setNewExpense({...newExpense, amount: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                      </div>
                      <button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={addExpense}
                      >
                        Tambah Pengeluaran
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {expenses.map((expense) => (
                            <tr key={expense.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(expense.date)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{expense.category}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">{expense.description}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatCurrency(expense.amount)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeExpense(expense.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Ringkasan Pengeluaran</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="mb-4">
                        <div className="text-sm text-gray-500">Total Pengeluaran</div>
                        <div className="text-2xl font-bold">{formatCurrency(calculateTotalExpenses())}</div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Per Kategori</h4>
                        {expensesByCategory.map((item, index) => (
                          <div key={index} className="bg-white p-3 rounded-md shadow-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{item.category}</span>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium">Laporan Bulanan</h4>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">
                            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                          </div>
                          <div className="text-lg font-bold">
                            {formatCurrency(monthlyExpenseReport.totalExpenses)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Accommodation Costs Tab */}
            {activeTab === 'akomodasi' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Biaya Akomodasi</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <h3 className="font-medium mb-4">Catat Biaya Akomodasi</h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jenis</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAccommodation.type}
                            onChange={(e) => setNewAccommodation({...newAccommodation, type: e.target.value})}
                          >
                            <option value="supplier_to_kitchen">Supplier ke Central Kitchen</option>
                            <option value="kitchen_to_customer">Central Kitchen ke Customer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAccommodation.date}
                            onChange={(e) => setNewAccommodation({...newAccommodation, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Kendaraan</label>
                          <input
                            type="text"
                            placeholder="Jenis kendaraan"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAccommodation.vehicle}
                            onChange={(e) => setNewAccommodation({...newAccommodation, vehicle: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jarak (km)</label>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAccommodation.distance}
                            onChange={(e) => setNewAccommodation({...newAccommodation, distance: Number(e.target.value)})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                          <input
                            type="text"
                            placeholder="Deskripsi pengiriman"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAccommodation.description}
                            onChange={(e) => setNewAccommodation({...newAccommodation, description: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Biaya (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newAccommodation.cost)}
                            onChange={(e) => setNewAccommodation({...newAccommodation, cost: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                      </div>
                      <button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={addAccommodation}
                      >
                        Tambah Biaya Akomodasi
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kendaraan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jarak</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biaya</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {accommodationCosts.map((cost) => (
                            <tr key={cost.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(cost.date)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {cost.type === 'supplier_to_kitchen' ? 'Supplier ke Central Kitchen' : 'Central Kitchen ke Customer'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{cost.vehicle}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{cost.distance} km</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatCurrency(cost.cost)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeAccommodation(cost.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Ringkasan Biaya Akomodasi</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="mb-4">
                        <div className="text-sm text-gray-500">Total Biaya Akomodasi</div>
                        <div className="text-2xl font-bold">{formatCurrency(calculateTotalAccommodationCosts())}</div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Per Jenis</h4>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">Supplier ke Central Kitchen</span>
                            <span>
                              {formatCurrency(
                                accommodationCosts
                                  .filter(cost => cost.type === 'supplier_to_kitchen')
                                  .reduce((sum, cost) => sum + (cost.cost || 0), 0)
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">Central Kitchen ke Customer</span>
                            <span>
                              {formatCurrency(
                                accommodationCosts
                                  .filter(cost => cost.type === 'kitchen_to_customer')
                                  .reduce((sum, cost) => sum + (cost.cost || 0), 0)
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium">Laporan Bulanan</h4>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <div className="text-sm text-gray-500 mb-1">
                            {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                          </div>
                          <div className="text-lg font-bold">
                            {formatCurrency(
                              accommodationCosts
                                .filter(cost => {
                                  if (!cost.date) return false;
                                  const costDate = new Date(cost.date);
                                  return costDate.getMonth() === new Date().getMonth() && 
                                         costDate.getFullYear() === new Date().getFullYear();
                                })
                                .reduce((sum, cost) => sum + (cost.cost || 0), 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Assets & Depreciation Tab */}
            {activeTab === 'aset' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Aset & Depresiasi</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Daftar Aset</h3>
                      <button
                        className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md transition"
                        onClick={() => {
                          setShowCategoryManagement(true);
                          setCategoryType('asset');
                        }}
                      >
                        Kelola Kategori
                      </button>
                    </div>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nama Aset</label>
                          <input
                            type="text"
                            placeholder="Nama aset"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAsset.name}
                            onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Kategori</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAsset.category}
                            onChange={(e) => setNewAsset({...newAsset, category: e.target.value})}
                          >
                            {assetCategories.map((category, index) => (
                              <option key={index} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tanggal Pembelian</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAsset.purchaseDate}
                            onChange={(e) => setNewAsset({...newAsset, purchaseDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Harga Pembelian (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newAsset.purchasePrice)}
                            onChange={(e) => setNewAsset({...newAsset, purchasePrice: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Umur Ekonomis (Tahun)</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="5"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAsset.usefulLife}
                            onChange={(e) => setNewAsset({...newAsset, usefulLife: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nilai Sisa (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newAsset.salvageValue)}
                            onChange={(e) => setNewAsset({...newAsset, salvageValue: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Metode Depresiasi</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newAsset.depreciationMethod}
                            onChange={(e) => setNewAsset({...newAsset, depreciationMethod: e.target.value})}
                          >
                            <option value="straight_line">Garis Lurus</option>
                            <option value="reducing_balance">Saldo Menurun</option>
                          </select>
                        </div>
                      </div>
                      <button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={addAsset}
                      >
                        Tambah Aset
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Pembelian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Pembelian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nilai Buku</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {assets.map((asset) => {
                            const depreciation = calculateDepreciation(asset, new Date().toISOString().split('T')[0]);
                            
                            return (
                              <tr key={asset.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{asset.category}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatDate(asset.purchaseDate)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatCurrency(asset.purchasePrice)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatCurrency(depreciation.remaining)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    className="text-red-600 hover:text-red-900"
                                    onClick={() => removeAsset(asset.id)}
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Ringkasan Depresiasi</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="mb-4">
                        <div className="text-sm text-gray-500">Total Nilai Aset</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(assets.reduce((sum, asset) => sum + asset.purchasePrice, 0))}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-gray-500">Total Akumulasi Depresiasi</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(assets.reduce((sum, asset) => {
                            const depreciation = calculateDepreciation(asset, new Date().toISOString().split('T')[0]);
                            return sum + depreciation.total;
                          }, 0))}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-gray-500">Total Nilai Buku</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(assets.reduce((sum, asset) => {
                            const depreciation = calculateDepreciation(asset, new Date().toISOString().split('T')[0]);
                            return sum + depreciation.remaining;
                          }, 0))}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Depresiasi Tahun Ini</h4>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <div className="text-lg font-bold">
                            {formatCurrency(calculateYearlyDepreciation(new Date().getFullYear()))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium">Depresiasi Bulan Ini</h4>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <div className="text-lg font-bold">
                            {formatCurrency(calculateMonthlyDepreciation(new Date().getFullYear(), new Date().getMonth()))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Founder Share Calculator Tab */}
            {activeTab === 'founder' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Founder Share Calculator</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Input Data Founder</h3>
                    
                    <div className="space-y-4">
                      {founderData.map((founder, index) => (
                        <div key={founder.id} className="bg-gray-50 p-4 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">{founder.name}</h4>
                            <div className="flex space-x-2">
                              <button
                                className="text-yellow-600 hover:text-yellow-900"
                                onClick={() => startEditingFounder(founder)}
                              >
                                Edit
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => removeFounder(founder.id)}
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Persentase (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={founder.percentage}
                              onChange={(e) => updateFounderData(index, 'percentage', Number(e.target.value))}
                            />
                          </div>
                        </div>
                      ))}
                      
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={addFounder}
                      >
                        Tambah Founder
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Hasil Perhitungan</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="space-y-4">
                        {founderShares.map((share) => (
                          <div key={share.id} className="flex justify-between items-center">
                            <span className="font-medium">{share.name}</span>
                            <span className="text-lg font-bold">{share.percentage.toFixed(2)}%</span>
                          </div>
                        ))}
                        
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <h4 className="font-medium mb-2">Total Persentase</h4>
                          <div className="text-lg font-bold">
                            {founderShares.reduce((sum, share) => sum + share.percentage, 0).toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {founderShares.reduce((sum, share) => sum + share.percentage, 0) !== 100 && (
                              <span className="text-red-500">
                                Persentase tidak sama dengan 100%. Silakan sesuaikan.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Edit Founder Modal */}
            {editingFounder && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Edit Founder</h3>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={cancelEditingFounder}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Founder</label>
                        <input
                          type="text"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingFounder.name}
                          onChange={(e) => setEditingFounder({...editingFounder, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Persentase (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingFounder.percentage}
                          onChange={(e) => setEditingFounder({...editingFounder, percentage: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        onClick={cancelEditingFounder}
                      >
                        Batal
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        onClick={saveEditedFounder}
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Electricity Management Tab */}
            {activeTab === 'listrik' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Manajemen Listrik</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Top Up Listrik</h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newVoucher.date}
                            onChange={(e) => setNewVoucher({...newVoucher, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jumlah (Rp)</label>
                          <input
                            type="text"
                            placeholder="500000"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newVoucher.amount)}
                            onChange={(e) => setNewVoucher({...newVoucher, amount: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                      </div>
                      <button
                        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={() => {
                          if (newVoucher.amount > 0) {
                            addElectricityVoucher(newVoucher);
                            setNewVoucher({ date: new Date().toISOString().split('T')[0], amount: 0 });
                          }
                        }}
                      >
                        Top Up Listrik
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah (Rp)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {electricityData.vouchers.map((voucher) => (
                            <tr key={voucher.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(voucher.date)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatCurrency(voucher.amount)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeElectricityVoucher(voucher.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Perangkat Listrik</h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nama Perangkat</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newDevice.name}
                            onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Daya (Watt)</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newDevice.watt}
                            onChange={(e) => setNewDevice({...newDevice, watt: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm text-gray-600 mb-1">Pemakaian per Hari (Jam)</label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newDevice.hours}
                          onChange={(e) => setNewDevice({...newDevice, hours: Number(e.target.value)})}
                        />
                      </div>
                      <button
                        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={() => {
                          if (newDevice.name && newDevice.watt > 0) {
                            addElectricityDevice(newDevice);
                            setNewDevice({ name: '', watt: 0, hours: 24 });
                          }
                        }}
                      >
                        Tambah Perangkat
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daya (W)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jam/Hari</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {electricityData.devices.map((device) => (
                            <tr key={device.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{device.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{device.watt} W</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{device.hours} jam</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeElectricityDevice(device.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Simulasi Pemakaian Listrik</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-md shadow">
                        <div className="text-sm text-gray-500">Total Daya</div>
                        <div className="text-xl font-bold">{electricityUsage.totalPower} W</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Batas Maks: {electricityUsage.maxPower} 
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, electricityUsage.powerUsagePercentage)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {electricityUsage.powerUsagePercentage.toFixed(1)}% dari batas maksimal
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-md shadow">
                        <div className="text-sm text-gray-500">Pemakaian Harian</div>
                        <div className="text-xl font-bold">{electricityUsage.dailyUsage.toFixed(2)} kWh</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Biaya: {formatCurrency(electricityUsage.dailyCost)}
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-md shadow">
                        <div className="text-sm text-gray-500">Pemakaian Bulanan</div>
                        <div className="text-xl font-bold">{electricityUsage.monthlyUsage.toFixed(2)} kWh</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Biaya: {formatCurrency(electricityUsage.monthlyCost)}
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-md shadow">
                        <div className="text-sm text-gray-500">Estimasi Biaya/Bulan</div>
                        <div className="text-xl font-bold">{formatCurrency(electricityUsage.estimatedCost)}</div>
                        {electricityUsage.expiryDate && (
                          <div className="text-sm text-gray-500 mt-1">
                            Voucher habis: {electricityUsage.expiryDate.toLocaleDateString('id-ID')}
                          </div>
                        )}
                        {electricityUsage.lastTopUp && (
                          <div className="text-sm text-gray-500 mt-1">
                            Top up terakhir: {formatDate(electricityUsage.lastTopUp.split('T')[0])} - {formatCurrency(electricityUsage.lastTopUpAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {electricityUsage.powerUsagePercentage > 100 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-md">
                        <div className="text-sm text-red-800 font-medium">
                          ⚠️ Peringatan: Total daya perangkat melebihi batas maksimal!
                        </div>
                        <div className="text-xs text-red-700 mt-1">
                          Silakan kurangi jumlah perangkat atau gunakan perangkat dengan daya lebih rendah.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Pengaturan Daya Maksimal</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Daya Maksimal (Watt)</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={electricityData.maxPower}
                          onChange={(e) => updateMaxPower(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tarif Listrik per kWh</label>
                        <input
                          type="number"
                          min="0"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={1444.70}
                          readOnly
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Tarif listrik standar PLN (Rp 1,444.70/kWh)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* HR & Salary Tab */}
            {activeTab === 'sdm' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">SDM & Gaji</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <h3 className="font-medium mb-4">Data Karyawan</h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nama</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newEmployee.name}
                            onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jabatan</label>
                          <input
                            type="text"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newEmployee.position}
                            onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tipe Karyawan</label>
                          <select
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newEmployee.employmentType}
                            onChange={(e) => setNewEmployee({...newEmployee, employmentType: e.target.value})}
                          >
                            <option value="full_time">Full Time</option>
                            <option value="part_time">Part Time</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Gaji Pokok</label>
                          <input
                            type="text"
                            min="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newEmployee.baseSalary)}
                            onChange={(e) => setNewEmployee({...newEmployee, baseSalary: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tunjangan</label>
                          <input
                            type="text"
                            min="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newEmployee.allowances)}
                            onChange={(e) => setNewEmployee({...newEmployee, allowances: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Potongan</label>
                          <input
                            type="text"
                            min="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newEmployee.deductions)}
                            onChange={(e) => setNewEmployee({...newEmployee, deductions: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Bayaran per Jam (untuk part time)</label>
                          <input
                            type="text"
                            min="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newEmployee.hourlyRate)}
                            onChange={(e) => setNewEmployee({...newEmployee, hourlyRate: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                      </div>
                      <button
                        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={() => {
                          if (newEmployee.name && newEmployee.position) {
                            addEmployee(newEmployee);
                            setNewEmployee({ 
                              name: '', 
                              position: '', 
                              employmentType: 'full_time',
                              baseSalary: 0, 
                              allowances: 0, 
                              deductions: 0,
                              hourlyRate: 0
                            });
                          }
                        }}
                      >
                        Tambah Karyawan
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jabatan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gaji Pokok</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gaji</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employees.map((employee) => (
                            <tr key={employee.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{employee.position}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {employee.employmentType === 'full_time' ? 'Full Time' : 'Part Time'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatCurrency(employee.baseSalary || 0)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{formatCurrency(calculateSalary(employee))}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  employee.paymentStatus === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {employee.paymentStatus === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                  onClick={() => generatePayslip(employee)}
                                >
                                  Slip Gaji
                                </button>
                                <button
                                  className="text-yellow-600 hover:text-yellow-900 mr-3"
                                  onClick={() => startEditingEmployee(employee)}
                                >
                                  Edit
                                </button>
                                {employee.employmentType === 'full_time' ? (
                                  <button
                                    className="text-green-600 hover:text-green-900 mr-3"
                                    onClick={() => openSalaryIncreaseModal(employee)}
                                  >
                                    Naik Gaji
                                  </button>
                                ) : (
                                  <button
                                    className="text-purple-600 hover:text-purple-900 mr-3"
                                    onClick={() => {
                                      setSelectedEmployee(employee);
                                      setSelectedEmployeeHistory(getEmployeeWorkHistory(employee.id));
                                      setNewWorkRecord({
                                        date: new Date().toISOString().split('T')[0],
                                        hours: 0,
                                        hourlyRate: employee.hourlyRate || 0,
                                        description: ''
                                      });
                                      setShowWorkHistoryModal(true);
                                    }}
                                  >
                                    Riwayat Kerja
                                  </button>
                                )}
                                {employee.paymentStatus === 'unpaid' ? (
                                  <button
                                    className="text-green-600 hover:text-green-900 mr-3"
                                    onClick={() => markEmployeeAsPaid(employee.id)}
                                  >
                                    Tandai Dibayar
                                  </button>
                                ) : (
                                  <button
                                    className="text-yellow-600 hover:text-yellow-900 mr-3"
                                    onClick={() => markEmployeeAsUnpaid(employee.id)}
                                  >
                                    Tandai Belum Dibayar
                                  </button>
                                )}
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeEmployee(employee.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Laporan Pengeluaran SDM</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="mb-4">
                        <div className="text-sm text-gray-500">Total Pengeluaran SDM (Sudah Dibayar)</div>
                        <div className="text-2xl font-bold">{formatCurrency(calculateTotalSalaryExpense())}</div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm text-gray-500">Total Pengeluaran SDM (Belum Dibayar)</div>
                        <div className="text-2xl font-bold">{formatCurrency(calculateUnpaidSalaries())}</div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-medium">Rincian per Karyawan</h4>
                        {employees.map((employee) => (
                          <div key={employee.id} className="bg-white p-3 rounded-md shadow-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{employee.name}</span>
                              <span>{formatCurrency(calculateSalary(employee))}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {employee.position} • {employee.employmentType === 'full_time' ? 'Full Time' : 'Part Time'} • 
                              {formatCurrency(employee.baseSalary || 0)} + {formatCurrency(employee.allowances || 0)} - {formatCurrency(employee.deductions || 0)}
                            </div>
                            <div className="mt-1">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                employee.paymentStatus === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {employee.paymentStatus === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium">Kalender Pembayaran</h4>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <div className="text-sm text-gray-500 mb-2">
                            Klik pada tanggal untuk melihat detail pembayaran
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-xs">
                            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, index) => (
                              <div key={index} className="font-medium py-1">{day}</div>
                            ))}
                            
                            {Array.from({ length: 35 }, (_, i) => {
                              const date = new Date();
                              date.setDate(1);
                              date.setDate(i - date.getDay() + 1);
                              
                              const dateStr = date.toISOString().split('T')[0];
                              const hasPayment = employees.some(emp => {
                                if (emp.employmentType === 'full_time' && emp.paymentStatus === 'paid') {
                                  // For full-time employees, check if they were paid this month
                                  return true;
                                } else if (emp.employmentType === 'part_time') {
                                  // For part-time employees, check if they have work history on this date
                                  return employeeWorkHistory.some(record => 
                                    record.employeeId === emp.id && record.date === dateStr
                                  );
                                }
                                return false;
                              });
                              
                              const isCurrentMonth = date.getMonth() === new Date().getMonth();
                              
                              return (
                                <div 
                                  key={i} 
                                  className={`p-1 rounded ${
                                    isCurrentMonth ? 'bg-white' : 'bg-gray-100 text-gray-400'
                                  } ${hasPayment ? 'bg-green-100' : ''}`}
                                >
                                  {date.getDate()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Edit Employee Modal */}
            {editingEmployee && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Edit Karyawan</h3>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={cancelEditingEmployee}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                        <input
                          type="text"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingEmployee.name}
                          onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                        <input
                          type="text"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingEmployee.position}
                          onChange={(e) => setEditingEmployee({...editingEmployee, position: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Karyawan</label>
                        <select
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={editingEmployee.employmentType}
                          onChange={(e) => setEditingEmployee({...editingEmployee, employmentType: e.target.value})}
                        >
                          <option value="full_time">Full Time</option>
                          <option value="part_time">Part Time</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gaji Pokok</label>
                        <input
                          type="text"
                          min="0"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formatCurrencyInput(editingEmployee.baseSalary)}
                          onChange={(e) => setEditingEmployee({...editingEmployee, baseSalary: parseCurrencyInput(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tunjangan</label>
                        <input
                          type="text"
                          min="0"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formatCurrencyInput(editingEmployee.allowances)}
                          onChange={(e) => setEditingEmployee({...editingEmployee, allowances: parseCurrencyInput(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Potongan</label>
                        <input
                          type="text"
                          min="0"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formatCurrencyInput(editingEmployee.deductions)}
                          onChange={(e) => setEditingEmployee({...editingEmployee, deductions: parseCurrencyInput(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bayaran per Jam (untuk part time)</label>
                        <input
                          type="text"
                          min="0"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formatCurrencyInput(editingEmployee.hourlyRate)}
                          onChange={(e) => setEditingEmployee({...editingEmployee, hourlyRate: parseCurrencyInput(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        onClick={cancelEditingEmployee}
                      >
                        Batal
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        onClick={saveEditedEmployee}
                      >
                        Simpan Perubahan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Debts & Receivables Tab */}
            {activeTab === 'hutangpiutang' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Hutang & Piutang</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4">Hutang</h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nama</label>
                          <input
                            type="text"
                            placeholder="Nama pemberi hutang"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newDebt.name}
                            onChange={(e) => setNewDebt({...newDebt, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jumlah (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newDebt.amount)}
                            onChange={(e) => setNewDebt({...newDebt, amount: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newDebt.date}
                            onChange={(e) => setNewDebt({...newDebt, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jatuh Tempo</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newDebt.dueDate}
                            onChange={(e) => setNewDebt({...newDebt, dueDate: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                          <input
                            type="text"
                            placeholder="Deskripsi hutang"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newDebt.description}
                            onChange={(e) => setNewDebt({...newDebt, description: e.target.value})}
                          />
                        </div>
                      </div>
                      <button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={addDebt}
                      >
                        Tambah Hutang
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {debts.map((debt) => (
                            <tr key={debt.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{debt.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(debt.date)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(debt.dueDate)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatCurrency(debt.amount)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  debt.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {debt.status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {debt.status === 'unpaid' ? (
                                  <button
                                    className="text-green-600 hover:text-green-900 mr-3"
                                    onClick={() => markDebtAsPaid(debt.id)}
                                  >
                                    Tandai Dibayar
                                  </button>
                                ) : (
                                  <button
                                    className="text-yellow-600 hover:text-yellow-900 mr-3"
                                    onClick={() => markDebtAsUnpaid(debt.id)}
                                  >
                                    Tandai Belum Dibayar
                                  </button>
                                )}
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeDebt(debt.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-4">Piutang</h3>
                    
                    <div className="mb-4 p-4 bg-gray-50 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nama</label>
                          <input
                            type="text"
                            placeholder="Nama penerima piutang"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newReceivable.name}
                            onChange={(e) => setNewReceivable({...newReceivable, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jumlah (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formatCurrencyInput(newReceivable.amount)}
                            onChange={(e) => setNewReceivable({...newReceivable, amount: parseCurrencyInput(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newReceivable.date}
                            onChange={(e) => setNewReceivable({...newReceivable, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Jatuh Tempo</label>
                          <input
                            type="date"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newReceivable.dueDate}
                            onChange={(e) => setNewReceivable({...newReceivable, dueDate: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                          <input
                            type="text"
                            placeholder="Deskripsi piutang"
                            className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={newReceivable.description}
                            onChange={(e) => setNewReceivable({...newReceivable, description: e.target.value})}
                          />
                        </div>
                      </div>
                      <button
                        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                        onClick={addReceivable}
                      >
                        Tambah Piutang
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {receivables.map((receivable) => (
                            <tr key={receivable.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{receivable.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(receivable.date)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(receivable.dueDate)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatCurrency(receivable.amount)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  receivable.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {receivable.status === 'paid' ? 'Sudah Diterima' : 'Belum Diterima'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {receivable.status === 'unpaid' ? (
                                  <button
                                    className="text-green-600 hover:text-green-900 mr-3"
                                    onClick={() => markReceivableAsPaid(receivable.id)}
                                  >
                                    Tandai Diterima
                                  </button>
                                ) : (
                                  <button
                                    className="text-yellow-600 hover:text-yellow-900 mr-3"
                                    onClick={() => markReceivableAsUnpaid(receivable.id)}
                                  >
                                    Tandai Belum Diterima
                                  </button>
                                )}
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeReceivable(receivable.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-medium mb-2">Ringkasan Hutang</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Hutang</span>
                        <span className="text-sm font-medium">{formatCurrency(calculateTotalDebts())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Sudah Dibayar</span>
                        <span className="text-sm font-medium text-green-600">{formatCurrency(calculatePaidDebts())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Belum Dibayar</span>
                        <span className="text-sm font-medium text-red-600">{formatCurrency(calculateUnpaidDebts())}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-medium mb-2">Ringkasan Piutang</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Piutang</span>
                        <span className="text-sm font-medium">{formatCurrency(calculateTotalReceivables())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Sudah Diterima</span>
                        <span className="text-sm font-medium text-green-600">{formatCurrency(calculatePaidReceivables())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Belum Diterima</span>
                        <span className="text-sm font-medium text-red-600">{formatCurrency(calculateUnpaidReceivables())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Reports Tab */}
            {activeTab === 'laporan' && (
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Laporan</h2>
                
                <div className="mb-6 flex justify-end space-x-3">
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition"
                    onClick={exportFinancialReportToPDF}
                  >
                    Export PDF
                  </button>
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition"
                    onClick={exportToExcel}
                  >
                    Export Excel
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-md shadow">
                    <h3 className="font-medium mb-2">Laporan Harian</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Tanggal</span>
                        <span className="text-sm">{formatDate(dailyReport.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Jumlah Transaksi</span>
                        <span className="text-sm">{dailyReport.transactionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Penjualan</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total HPP</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Laba Kotor</span>
                        <span className={`text-sm font-medium ${dailyReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(dailyReport.grossProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pengeluaran</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.todayExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Biaya Akomodasi</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.todayAccommodation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Depresiasi</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.todayDepreciation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Gaji Karyawan</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.todaySalaries)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pembayaran Hutang</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.todayDebtPayments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Penerimaan Piutang</span>
                        <span className="text-sm font-medium">{formatCurrency(dailyReport.todayReceivableCollections)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Laba Bersih</span>
                        <span className={`text-sm font-bold ${dailyReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(dailyReport.netProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Item</span>
                        <span className="text-sm">{dailyReport.totalItems}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md shadow">
                    <h3 className="font-medium mb-2">Laporan Bulanan</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Bulan</span>
                        <span className="text-sm">{monthlyReport.month}/{monthlyReport.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Jumlah Transaksi</span>
                        <span className="text-sm">{monthlyReport.transactionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Penjualan</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total HPP</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Laba Kotor</span>
                        <span className={`text-sm font-medium ${monthlyReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(monthlyReport.grossProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pengeluaran</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.monthlyExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Biaya Akomodasi</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.monthlyAccommodation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Depresiasi</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.monthlyDepreciation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Gaji Karyawan</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.monthlySalaries)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pembayaran Hutang</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.monthlyDebtPayments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Penerimaan Piutang</span>
                        <span className="text-sm font-medium">{formatCurrency(monthlyReport.monthlyReceivableCollections)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Laba Bersih</span>
                        <span className={`text-sm font-bold ${monthlyReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(monthlyReport.netProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Item</span>
                        <span className="text-sm">{monthlyReport.totalItems}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md shadow">
                    <h3 className="font-medium mb-2">Laporan Tahunan</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Tahun</span>
                        <span className="text-sm">{yearlyReport.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Jumlah Transaksi</span>
                        <span className="text-sm">{yearlyReport.transactionCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Penjualan</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.totalSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total HPP</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Laba Kotor</span>
                        <span className={`text-sm font-medium ${yearlyReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(yearlyReport.grossProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pengeluaran</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.yearlyExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Biaya Akomodasi</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.yearlyAccommodation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Depresiasi</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.yearlyDepreciation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Gaji Karyawan</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.yearlySalaries)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Pembayaran Hutang</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.yearlyDebtPayments)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Penerimaan Piutang</span>
                        <span className="text-sm font-medium">{formatCurrency(yearlyReport.yearlyReceivableCollections)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Laba Bersih</span>
                        <span className={`text-sm font-bold ${yearlyReport.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(yearlyReport.netProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Item</span>
                        <span className="text-sm">{yearlyReport.totalItems}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Grafik Penjualan & Laba</h3>
                    <div className="flex space-x-2">
                      <button
                        className={`px-3 py-1 text-sm rounded-md ${
                          chartType === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => handleChartTypeChange('daily')}
                      >
                        Harian
                      </button>
                      <button
                        className={`px-3 py-1 text-sm rounded-md ${
                          chartType === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => handleChartTypeChange('monthly')}
                      >
                        Bulanan
                      </button>
                      <button
                        className={`px-3 py-1 text-sm rounded-md ${
                          chartType === 'yearly' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                        onClick={() => handleChartTypeChange('yearly')}
                      >
                        Tahunan
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md shadow">
                    <div className="h-96">
                      <canvas ref={chartRef}></canvas>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-4">Pengeluaran per Kategori</h3>
                  
                  <div className="bg-white p-4 rounded-md shadow">
                    <div className="h-96">
                      <canvas ref={chartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Category Management Modal */}
      {showCategoryManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Kelola {categoryType === 'expense' ? 'Kategori Pengeluaran' : 'Kategori Aset'}
                </h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCategoryManagement(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tambah Kategori Baru
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Nama kategori"
                    className="flex-1 rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition"
                    onClick={addCategory}
                  >
                    Tambah
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Daftar Kategori</h4>
                <div className="bg-gray-50 rounded-md max-h-60 overflow-y-auto">
                  {(categoryType === 'expense' ? expenseCategories : assetCategories).map((category, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border-b border-gray-200">
                      <span>{category}</span>
                      <div className="flex space-x-2">
                        <button
                          className="text-yellow-600 hover:text-yellow-900"
                          onClick={() => {
                            const newCatName = prompt('Edit nama kategori:', category);
                            if (newCatName && newCatName.trim() !== '') {
                              updateCategory(category, newCatName.trim());
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => removeCategory(category)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  onClick={() => setShowCategoryManagement(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Salary Increase Modal */}
      {showSalaryIncreaseModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Simulasi Kenaikan Gaji</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowSalaryIncreaseModal(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Karyawan</span>
                  <span className="font-medium">{selectedEmployee.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Jabatan</span>
                  <span className="font-medium">{selectedEmployee.position}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Gaji Saat Ini</span>
                  <span className="font-medium">{formatCurrency(selectedEmployee.baseSalary || 0)}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gaji Baru
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formatCurrencyInput(newSalary)}
                  onChange={(e) => {
                    const value = parseCurrencyInput(e.target.value);
                    setNewSalary(value);
                    
                    if (salaryImpact) {
                      const currentSalary = calculateSalary(selectedEmployee);
                      const newTotalSalary = value + (selectedEmployee.allowances || 0) - (selectedEmployee.deductions || 0);
                      const difference = newTotalSalary - currentSalary;
                      
                      setSalaryImpact({
                        ...salaryImpact,
                        newTotalSalary,
                        difference,
                        monthlyImpact: difference,
                        yearlyImpact: difference * 12,
                        profitImpact: difference * 10
                      });
                    }
                  }}
                />
              </div>
              
              {salaryImpact && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">Dampak Kenaikan Gaji</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selisih Gaji:</span>
                      <span className={`font-medium ${salaryImpact.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(salaryImpact.difference)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dampak Bulanan:</span>
                      <span className={`font-medium ${salaryImpact.monthlyImpact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(salaryImpact.monthlyImpact)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dampak Tahunan:</span>
                      <span className={`font-medium ${salaryImpact.yearlyImpact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(salaryImpact.yearlyImpact)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dampak pada Laba (10% margin):</span>
                      <span className={`font-medium ${salaryImpact.profitImpact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(salaryImpact.profitImpact)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowSalaryIncreaseModal(false)}
                >
                  Batal
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  onClick={confirmSalaryIncrease}
                >
                  Konfirmasi Kenaikan Gaji
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Work History Modal */}
      {showWorkHistoryModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Riwayat Kerja - {selectedEmployee.name}</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowWorkHistoryModal(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Tambah Catatan Kerja</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tanggal</label>
                        <input
                          type="date"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newWorkRecord.date}
                          onChange={(e) => setNewWorkRecord({...newWorkRecord, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Jam Kerja</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newWorkRecord.hours}
                          onChange={(e) => setNewWorkRecord({...newWorkRecord, hours: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Bayaran per Jam</label>
                        <input
                          type="text"
                          min="0"
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={formatCurrencyInput(newWorkRecord.hourlyRate)}
                          onChange={(e) => setNewWorkRecord({...newWorkRecord, hourlyRate: parseCurrencyInput(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Deskripsi</label>
                        <textarea
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newWorkRecord.description}
                          onChange={(e) => setNewWorkRecord({...newWorkRecord, description: e.target.value})}
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Total Bayaran</label>
                        <input
                          type="text"
                          readOnly
                          className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm bg-gray-100"
                          value={formatCurrency(newWorkRecord.hours * newWorkRecord.hourlyRate)}
                        />
                      </div>
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition w-full"
                        onClick={() => {
                          if (newWorkRecord.date && newWorkRecord.hours > 0 && newWorkRecord.hourlyRate > 0) {
                            addWorkRecord(selectedEmployee.id, newWorkRecord);
                            setSelectedEmployeeHistory(getEmployeeWorkHistory(selectedEmployee.id));
                            setNewWorkRecord({
                              date: new Date().toISOString().split('T')[0],
                              hours: 0,
                              hourlyRate: selectedEmployee.hourlyRate || 0,
                              description: ''
                            });
                          }
                        }}
                      >
                        Tambah Catatan Kerja
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Riwayat Kerja</h4>
                  <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                    {selectedEmployeeHistory.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jam</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bayaran</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedEmployeeHistory.map((record) => (
                            <tr key={record.id}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {record.hours} jam
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(record.hourlyRate)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(record.hours * record.hourlyRate)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                <button
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => removeWorkRecord(record.id)}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Belum ada riwayat kerja</p>
                    )}
                  </div>
                  
                  <div className="mt-4 bg-blue-50 p-3 rounded-md">
                    <h4 className="font-medium text-blue-800 mb-2">Total Pendapatan</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Bulan Ini:</span>
                        <div className="font-medium">
                          {formatCurrency(
                            calculateEmployeeMonthlyEarnings(
                              selectedEmployee.id, 
                              new Date().getFullYear(), 
                              new Date().getMonth()
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Semua:</span>
                        <div className="font-medium">
                          {formatCurrency(
                            selectedEmployeeHistory.reduce(
                              (sum, record) => sum + (record.hours * record.hourlyRate), 
                              0
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  onClick={() => setShowWorkHistoryModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}