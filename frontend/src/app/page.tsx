"use client";
import { useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { useRouter } from 'next/navigation';
import api from '../api/client';
import styles from './page.module.css';

export default function AuthPage() {
  const { user, login } = useContext(AuthContext);
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      router.push('/discover');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { username, password });
        login(res.data.username);
      } else {
        await api.post('/auth/register', { username, password, email });
        setIsLogin(true);
        alert("Registration successful! Please log in.");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    }
  };

  if (user) return null; // Let the effect redirect

  return (
    <div className={styles.container}>
      <div className={styles.authBox}>
        <h2 className={styles.title}>{isLogin ? 'Login to Pro Tracker' : 'Create an Account'}</h2>
        <form onSubmit={handleSubmit}>
          <input className={styles.input} type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          {!isLogin && <input className={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />}
          <input className={styles.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
          <button className={styles.button} type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
        </form>
        <div className={styles.toggle} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
        </div>
      </div>
    </div>
  );
}
