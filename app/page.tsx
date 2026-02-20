'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  category_id: number;
  type: 'income' | 'expense';
  category_name?: string;
}

interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
}

interface LoginData {
  username: string;
  password: string;
}

interface TransactionData {
  amount: string;
  description: string;
  category_id: string;
  type: 'income' | 'expense';
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [loginData, setLoginData] = useState<LoginData>({ username: '', password: '' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [balance, setBalance] = useState({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [newTransaction, setNewTransaction] = useState<TransactionData>({
    amount: '',
    description: '',
    category_id: '',
    type: 'expense'
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setShowLogin(false);
      fetchData(savedToken);
    }
  }, []);

  const fetchData = async (token: string) => {
    try {
      setIsLoading(true);

      const transRes = await fetch('http://localhost:8000/api/v1/transactions/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const catRes = await fetch('http://localhost:8000/api/v1/categories/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const balanceRes = await fetch('http://localhost:8000/api/v1/analytics/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (transRes.ok && catRes.ok && balanceRes.ok) {
        const transData = await transRes.json();
        const catData = await catRes.json();
        const balanceData = await balanceRes.json();

        const transactionsWithCategories = transData.map((t: Transaction) => ({
          ...t,
          category_name: catData.find((c: Category) => c.id === t.category_id)?.name || 'Без категории'
        }));

        setTransactions(transactionsWithCategories || []);
        setCategories(catData || []);
        setBalance(balanceData || { income: 0, expense: 0, balance: 0 });
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      console.log('Попытка входа:', loginData);

      const formData = new URLSearchParams();
      formData.append('username', loginData.username);
      formData.append('password', loginData.password);

      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      console.log('Статус ответа:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('Успех, токен получен');
        const newToken = data.access_token;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setShowLogin(false);
        fetchData(newToken);
      } else {
        const errorData = await res.json();
        console.log('Ошибка от сервера:', errorData);
        alert('Ошибка входа: ' + (errorData.detail || 'неверные данные'));
      }
    } catch (err) {
      console.error('Ошибка соединения:', err);
      alert('Ошибка соединения с сервером');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setShowLogin(true);
    setLoginData({ username: '', password: '' });
  };

  const handleAddTransaction = async () => {
    if (!token) return;

    try {
      const res = await fetch('http://localhost:8000/api/v1/transactions/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(newTransaction.amount),
          description: newTransaction.description,
          category_id: parseInt(newTransaction.category_id),
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        setNewTransaction({
          amount: '',
          description: '',
          category_id: '',
          type: 'expense'
        });
        fetchData(token);
      } else {
        alert('Ошибка при добавлении транзакции');
      }
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка соединения');
    }
  };

  if (showLogin) {
    return (
      <main className="p-8 max-w-md mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">💰 Balance+</h1>

          <input
            type="text"
            placeholder="Логин"
            value={loginData.username}
            onChange={(e) => setLoginData({...loginData, username: e.target.value})}
            className="w-full p-3 border-4 border-black rounded-xl font-bold text-black bg-yellow-100 mb-4 placeholder-black focus:bg-yellow-200 focus:outline-none"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            className="w-full p-3 border-4 border-black rounded-xl font-bold text-black bg-yellow-100 mb-4 placeholder-black focus:bg-yellow-200 focus:outline-none"
          />

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl transition-colors"
          >
            Войти
          </button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="p-8 max-w-6xl mx-auto text-center">
        <p className="text-xl">Загрузка...</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">💰 Balance+</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Выйти
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600 mb-2">Доходы</p>
          <p className="text-2xl font-bold text-green-600">
            +{(balance?.income || 0).toLocaleString()} ₽
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600 mb-2">Расходы</p>
          <p className="text-2xl font-bold text-red-600">
            -{(balance?.expense || 0).toLocaleString()} ₽
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-600 mb-2">Баланс</p>
          <p className={`text-2xl font-bold ${(balance?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(balance?.balance || 0).toLocaleString()} ₽
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <h2 className="text-xl font-bold mb-4">Добавить транзакцию</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="number"
            placeholder="Сумма"
            value={newTransaction.amount}
            onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Описание"
            value={newTransaction.description}
            onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
            className="p-2 border rounded"
          />
          <select
            value={newTransaction.category_id}
            onChange={(e) => setNewTransaction({...newTransaction, category_id: e.target.value})}
            className="p-2 border rounded"
          >
            <option value="">Категория</option>
            {categories
              .filter(c => c.type === newTransaction.type)
              .map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            }
          </select>
          <select
            value={newTransaction.type}
            onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as 'income' | 'expense'})}
            className="p-2 border rounded"
          >
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </select>
          <button
            onClick={handleAddTransaction}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
          >
            Добавить
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4">Последние транзакции</h2>
        <div className="space-y-3">
          {transactions.slice(0, 10).map((t) => (
            <div key={t.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-sm text-gray-600">{t.category_name} • {new Date(t.date).toLocaleDateString()}</p>
              </div>
              <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₽
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}