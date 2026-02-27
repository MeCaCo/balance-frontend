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

interface TransactionData {
  amount: string;
  description: string;
  category_id: string;
  type: 'income' | 'expense';
}

interface CategoryData {
  name: string;
  type: 'income' | 'expense';
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState<RegisterData>({
    email: '',
    username: '',
    password: ''
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [balance, setBalance] = useState({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryData>({ name: '', type: 'expense' });
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

      const [transRes, catRes, balanceRes] = await Promise.all([
        fetch('http://localhost:8000/api/v1/transactions/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/v1/categories/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/v1/analytics/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

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

  const handleRegister = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerData)
      });

      if (res.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        setShowRegister(false);
        setRegisterData({ email: '', username: '', password: '' });
      } else {
        const error = await res.json();
        alert('Ошибка регистрации: ' + (error.detail || 'проверьте данные'));
      }
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка соединения');
    }
  };

  const handleLogin = async () => {
    try {
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

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setShowLogin(false);
        fetchData(data.access_token);
      } else {
        const errorData = await res.json();
        alert('Ошибка входа: ' + (errorData.detail || 'неверные данные'));
      }
    } catch (err) {
      console.error('Ошибка соединения:', err);
      alert('Ошибка соединения с сервером');
    }
  };

  const handleAddCategory = async () => {
    if (!token || !newCategory.name) return;

    try {
      const res = await fetch('http://localhost:8000/api/v1/categories/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCategory)
      });

      if (res.ok) {
        setNewCategory({ name: '', type: 'expense' });
        setShowAddCategory(false);
        fetchData(token);
      } else {
        alert('Ошибка при создании категории');
      }
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleAddTransaction = async () => {
    if (!token) return;

    const categoryId = parseInt(newTransaction.category_id);
    if (!categoryId || categoryId === 0) {
      alert('Выберите категорию');
      return;
    }

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
          category_id: categoryId,
          type: newTransaction.type,
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
        const error = await res.json();
        alert('Ошибка при добавлении транзакции: ' + (error.detail || 'неизвестная ошибка'));
      }
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка соединения');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/api/v1/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchData(token);
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setShowLogin(true);
    setLoginData({ username: '', password: '' });
  };

  if (showLogin) {
    return (
      <main className="p-8 max-w-md mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200 w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">💰 Balance+</h1>

          {showRegister ? (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Регистрация</h2>
              <input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 bg-white mb-4 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Имя пользователя"
                value={registerData.username}
                onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 bg-white mb-4 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Пароль"
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 bg-white mb-4 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleRegister}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold p-3 rounded-xl transition-colors mb-4"
              >
                Зарегистрироваться
              </button>
              <p className="text-center text-gray-600">
                Уже есть аккаунт?{' '}
                <button
                  onClick={() => setShowRegister(false)}
                  className="text-blue-600 hover:underline"
                >
                  Войти
                </button>
              </p>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Имя пользователя"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 bg-white mb-4 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="password"
                placeholder="Пароль"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full p-3 border-2 border-gray-300 rounded-xl text-gray-900 bg-white mb-4 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl transition-colors mb-4"
              >
                Войти
              </button>
              <p className="text-center text-gray-600">
                Нет аккаунта?{' '}
                <button
                  onClick={() => setShowRegister(true)}
                  className="text-blue-600 hover:underline"
                >
                  Зарегистрироваться
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="p-8 max-w-6xl mx-auto text-center">
        <p className="text-xl text-gray-800">Загрузка...</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💰 Balance+</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Выйти
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-700 font-medium mb-2">Доходы</p>
          <p className="text-3xl font-bold text-green-600">
            +{(balance?.income || 0).toLocaleString()} ₽
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-700 font-medium mb-2">Расходы</p>
          <p className="text-3xl font-bold text-red-600">
            -{(balance?.expense || 0).toLocaleString()} ₽
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-gray-700 font-medium mb-2">Баланс</p>
          <p className={`text-3xl font-bold ${(balance?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(balance?.balance || 0).toLocaleString()} ₽
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Категории</h2>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              + Новая
            </button>
          </div>

          {showAddCategory && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Название категории"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                className="w-full p-2 border rounded mb-2 text-gray-900 placeholder-gray-500"
              />
              <select
                value={newCategory.type}
                onChange={(e) => setNewCategory({...newCategory, type: e.target.value as 'income' | 'expense'})}
                className="w-full p-2 border rounded mb-2 text-gray-900"
              >
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
              <button
                onClick={handleAddCategory}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded font-medium"
              >
                Создать
              </button>
            </div>
          )}

          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-900">{c.name}</span>
                <span className={`text-sm font-medium ${c.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {c.type === 'income' ? 'Доход' : 'Расход'}
                </span>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-gray-700 text-center py-2">Нет категорий. Создайте первую!</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Добавить транзакцию</h2>
          <div className="space-y-3">
            <input
              type="number"
              placeholder="Сумма"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
            />
            <input
              type="text"
              placeholder="Описание"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
            />
            <select
              value={newTransaction.category_id}
              onChange={(e) => setNewTransaction({...newTransaction, category_id: e.target.value})}
              className="w-full p-2 border rounded text-gray-900"
            >
              <option value="">Выберите категорию</option>
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
              className="w-full p-2 border rounded text-gray-900"
            >
              <option value="expense">Расход</option>
              <option value="income">Доход</option>
            </select>
            <button
              onClick={handleAddTransaction}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-medium"
            >
              Добавить
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Последние транзакции</h2>
        <div className="space-y-3">
          {transactions.slice(0, 10).map((t) => (
            <div key={t.id} className="flex justify-between items-center p-3 border rounded hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{t.description}</p>
                <p className="text-sm text-gray-700">
                  {t.category_name} • {new Date(t.date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ₽
                </p>
                <button
                  onClick={() => handleDeleteTransaction(t.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-gray-700 text-center py-4">Нет транзакций</p>
          )}
        </div>
      </div>
    </main>
  );
}