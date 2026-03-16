/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  Plus, 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  Wallet, 
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  Trash2,
  X,
  Home,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  HeartPulse,
  MoreHorizontal,
  Coffee,
  Gift,
  GraduationCap,
  Plane,
  Gamepad2,
  Briefcase,
  Dumbbell,
  PawPrint,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO, 
  subMonths, 
  subYears, 
  startOfDay, 
  endOfDay,
  startOfYear,
  endOfYear
} from 'date-fns';
import { cn, formatCurrency } from './lib/utils';
import { Expense, Category, DEFAULT_CATEGORIES, PaymentMethod, AVAILABLE_ICONS } from './types';
import { getDocFromServer } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const IconMap: Record<string, any> = {
  Utensils, Car, ShoppingBag, Receipt, Film, HeartPulse, Home, 
  MoreHorizontal, Coffee, Gift, GraduationCap, Plane, Smartphone, 
  Gamepad2, Briefcase, Dumbbell, PawPrint
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'categories'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Auth Listener
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Ensure user doc exists
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            createdAt: new Date().toISOString()
          });
        }
      }
    });
    return unsubscribe;
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const qExpenses = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
      const exps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(exps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });

    const qCategories = query(
      collection(db, 'categories'),
      where('userId', '==', user.uid)
    );

    const unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeCategories();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-bold text-stone-900 mb-2 tracking-tight">SpendWise</h1>
        <p className="text-stone-500 mb-8 max-w-xs">
          Track your daily expenses with ease. Simple, secure, and family-friendly.
        </p>
        <button
          onClick={handleLogin}
          className="w-full max-w-xs bg-stone-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-stone-800 transition-all shadow-lg active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Continue with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-bold text-stone-900">SpendWise</h1>
        </div>
        <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-red-500 transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4">
        {activeTab === 'dashboard' && (
          <Dashboard expenses={expenses} categories={categories} />
        )}
        {activeTab === 'history' && (
          <HistoryView 
            expenses={expenses} 
            onEdit={(exp) => setEditingExpense(exp)} 
          />
        )}
        {activeTab === 'categories' && (
          <CategoryManager categories={categories} userId={user.uid} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3 flex justify-between items-center z-20">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={24} />} 
          label="Home" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          icon={<History size={24} />} 
          label="History" 
        />
        <div className="relative -top-8">
          <button 
            onClick={() => {
              setEditingExpense(null);
              setIsAddModalOpen(true);
            }}
            className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-200 active:scale-90 transition-transform"
          >
            <Plus size={32} />
          </button>
        </div>
        <NavButton 
          active={activeTab === 'categories'} 
          onClick={() => setActiveTab('categories')} 
          icon={<Settings size={24} />} 
          label="Setup" 
        />
        <div className="w-12 h-12 flex flex-col items-center justify-center">
          <img src={user.photoURL || ''} className="w-6 h-6 rounded-full border border-stone-200" alt="Profile" />
          <span className="text-[10px] mt-1 text-stone-400">Me</span>
        </div>
      </nav>

      {/* Add/Edit Expense Modal */}
      {(isAddModalOpen || editingExpense) && (
        <AddExpenseModal 
          expense={editingExpense || undefined}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingExpense(null);
          }} 
          userId={user.uid} 
          categories={[...DEFAULT_CATEGORIES, ...categories]} 
        />
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-colors",
        active ? "text-emerald-600" : "text-stone-400"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function Dashboard({ expenses, categories }: { expenses: Expense[], categories: Category[] }) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear'>('thisMonth');
  
  const getInterval = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last3Months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const interval = getInterval();
  const filteredExpenses = expenses.filter(e => {
    const d = parseISO(e.date);
    return isWithinInterval(d, interval);
  });

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryData = filteredExpenses.reduce((acc: any[], exp) => {
    const existing = acc.find(a => a.name === exp.category);
    if (existing) {
      existing.value += exp.amount;
    } else {
      acc.push({ name: exp.category, value: exp.amount });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const paymentData = filteredExpenses.reduce((acc: any[], exp) => {
    const existing = acc.find(a => a.name === exp.paymentMethod);
    if (existing) {
      existing.value += exp.amount;
    } else {
      acc.push({ name: exp.paymentMethod, value: exp.amount });
    }
    return acc;
  }, []);

  const filterLabels = {
    today: 'Today',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    last3Months: 'Last 3 Months',
    thisYear: 'This Year'
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filter Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(Object.keys(filterLabels) as Array<keyof typeof filterLabels>).map((key) => (
          <button
            key={key}
            onClick={() => setTimeFilter(key)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              timeFilter === key 
                ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100" 
                : "bg-white text-stone-500 border-stone-200 hover:border-emerald-200"
            )}
          >
            {filterLabels[key]}
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-stone-900 rounded-3xl p-6 text-white shadow-2xl shadow-stone-200 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <p className="text-stone-400 text-sm font-medium mb-1">Total Spending • {filterLabels[timeFilter]}</p>
        <h2 className="text-4xl font-bold tracking-tight mb-6">{formatCurrency(totalSpent)}</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold mb-1">Top Category</p>
            <p className="font-semibold truncate">{categoryData[0]?.name || 'N/A'}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold mb-1">Transactions</p>
            <p className="font-semibold">{filteredExpenses.length}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-stone-200">
          <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" />
            Spending by Category
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {categoryData.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-stone-600">{item.name}</span>
                </div>
                <span className="font-semibold text-stone-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-200">
          <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-blue-500" />
            Payment Methods
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={60} fontSize={12} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900">Recent</h3>
          <button className="text-emerald-600 text-sm font-semibold">View All</button>
        </div>
        <div className="space-y-3">
          {expenses.slice(0, 5).map(expense => (
            <div key={expense.id}>
              <ExpenseItem expense={expense} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpenseItem({ expense }: { expense: Expense }) {
  const getIcon = (method: string) => {
    switch (method) {
      case 'UPI': return <Smartphone size={16} />;
      case 'Cash': return <Banknote size={16} />;
      case 'Card': return <CreditCard size={16} />;
      default: return <Wallet size={16} />;
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center justify-between group hover:border-emerald-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
          {getIcon(expense.paymentMethod)}
        </div>
        <div>
          <p className="font-bold text-stone-900">{expense.category}</p>
          <p className="text-xs text-stone-400">{format(parseISO(expense.date), 'MMM dd, yyyy')} • {expense.paymentMethod}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-stone-900">-{formatCurrency(expense.amount)}</p>
        {expense.note && <p className="text-[10px] text-stone-400 truncate max-w-[80px]">{expense.note}</p>}
      </div>
    </div>
  );
}

function HistoryView({ expenses, onEdit }: { expenses: Expense[], onEdit: (exp: Expense) => void }) {
  const [filterDate, setFilterDate] = useState<string>('');

  const filteredExpenses = filterDate 
    ? expenses.filter(e => format(parseISO(e.date), 'yyyy-MM-dd') === filterDate)
    : expenses;

  const dailyTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">History</h2>
        <div className="relative">
          <input 
            type="date" 
            className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button 
              onClick={() => setFilterDate('')}
              className="absolute -top-2 -right-2 bg-stone-900 text-white rounded-full p-1"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {filterDate && (
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center">
          <span className="text-emerald-800 font-medium">Total for {format(parseISO(filterDate), 'MMM dd')}</span>
          <span className="text-emerald-900 font-bold">{formatCurrency(dailyTotal)}</span>
        </div>
      )}

      <div className="space-y-3">
        {filteredExpenses.map(expense => (
          <div key={expense.id} className="relative group">
             <ExpenseItem expense={expense} />
             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={() => onEdit(expense)}
                 className="p-1.5 bg-white shadow-sm border border-stone-100 rounded-lg text-stone-400 hover:text-emerald-500"
               >
                 <Settings size={14} />
               </button>
               <button 
                 onClick={async () => {
                   if (confirm('Delete this transaction?')) {
                     try {
                       await deleteDoc(doc(db, 'expenses', expense.id!));
                     } catch (error) {
                       handleFirestoreError(error, OperationType.DELETE, `expenses/${expense.id}`);
                     }
                   }
                 }}
                 className="p-1.5 bg-white shadow-sm border border-stone-100 rounded-lg text-stone-400 hover:text-red-500"
               >
                 <Trash2 size={14} />
               </button>
             </div>
          </div>
        ))}
        {filteredExpenses.length === 0 && (
          <div className="text-center py-20 text-stone-400">
            <History size={48} className="mx-auto mb-4 opacity-20" />
            <p>{filterDate ? 'No transactions on this date.' : 'No transactions yet.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryManager({ categories, userId }: { categories: Category[], userId: string }) {
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newName,
        icon: selectedIcon,
        userId,
        isDefault: false
      });
      setNewName('');
      setSelectedIcon(AVAILABLE_ICONS[0]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-stone-900">Manage Categories</h2>
      
      <form onSubmit={handleAdd} className="space-y-4 bg-white p-6 rounded-3xl border border-stone-200">
        <div>
          <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Category Name</label>
          <input 
            type="text" 
            placeholder="e.g. Gym, Subscriptions..." 
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Select Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {AVAILABLE_ICONS.map(iconName => {
              const IconComp = IconMap[iconName] || MoreHorizontal;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  className={cn(
                    "p-3 rounded-xl flex items-center justify-center transition-all border",
                    selectedIcon === iconName 
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-md" 
                      : "bg-stone-50 text-stone-400 border-stone-100 hover:border-emerald-200"
                  )}
                >
                  <IconComp size={20} />
                </button>
              );
            })}
          </div>
        </div>

        <button type="submit" className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 active:scale-95 transition-transform">
          Add Custom Category
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Default</h3>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_CATEGORIES.map(cat => {
            const IconComp = IconMap[cat.icon || 'MoreHorizontal'] || MoreHorizontal;
            return (
              <div key={cat.name} className="bg-white p-3 rounded-xl border border-stone-100 text-stone-600 flex items-center gap-3">
                <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center text-stone-400">
                  <IconComp size={16} />
                </div>
                <span className="font-medium">{cat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Custom</h3>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(cat => {
            const IconComp = IconMap[cat.icon || 'MoreHorizontal'] || MoreHorizontal;
            return (
              <div key={cat.id} className="bg-white p-3 rounded-xl border border-stone-200 text-stone-900 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <IconComp size={16} />
                  </div>
                  <span className="font-medium">{cat.name}</span>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, 'categories', cat.id!));
                    } catch (error) {
                      handleFirestoreError(error, OperationType.DELETE, `categories/${cat.id}`);
                    }
                  }}
                  className="text-stone-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          {categories.length === 0 && <p className="text-stone-400 text-sm italic col-span-2">No custom categories added.</p>}
        </div>
      </div>
    </div>
  );
}

function AddExpenseModal({ onClose, userId, categories, expense }: { onClose: () => void, userId: string, categories: Partial<Category>[], expense?: Expense }) {
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [category, setCategory] = useState(expense?.category || categories[0]?.name || '');
  const [method, setMethod] = useState<PaymentMethod>(expense?.paymentMethod || 'UPI');
  const [note, setNote] = useState(expense?.note || '');
  const [date, setDate] = useState(expense ? format(parseISO(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    try {
      const data = {
        amount: Number(amount),
        category,
        paymentMethod: method,
        note,
        date: new Date(date).toISOString(),
        userId
      };

      if (expense?.id) {
        await setDoc(doc(db, 'expenses', expense.id), data);
      } else {
        await addDoc(collection(db, 'expenses'), data);
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, expense ? OperationType.UPDATE : OperationType.CREATE, expense ? `expenses/${expense.id}` : 'expenses');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-stone-900">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-stone-400">₹</span>
              <input 
                type="number" 
                placeholder="0.00" 
                autoFocus
                className="w-full bg-stone-50 border-none rounded-2xl pl-10 pr-4 py-4 text-3xl font-bold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Category</label>
              <select 
                className="w-full bg-stone-50 border-none rounded-2xl px-4 py-3 font-medium text-stone-900 focus:ring-2 focus:ring-emerald-500"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Method</label>
              <select 
                className="w-full bg-stone-50 border-none rounded-2xl px-4 py-3 font-medium text-stone-900 focus:ring-2 focus:ring-emerald-500"
                value={method}
                onChange={e => setMethod(e.target.value as PaymentMethod)}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Date</label>
            <input 
              type="date" 
              className="w-full bg-stone-50 border-none rounded-2xl px-4 py-3 font-medium text-stone-900 focus:ring-2 focus:ring-emerald-500"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Note (Optional)</label>
            <input 
              type="text" 
              placeholder="What was this for?" 
              className="w-full bg-stone-50 border-none rounded-2xl px-4 py-3 font-medium text-stone-900 focus:ring-2 focus:ring-emerald-500"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-colors active:scale-95"
          >
            Save Expense
          </button>
        </form>
      </div>
    </div>
  );
}
