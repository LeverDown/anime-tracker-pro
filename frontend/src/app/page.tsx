"use client";
import React, { useState, useContext, useEffect, JSX } from 'react';
/* eslint-disable react-hooks/set-state-in-effect */
import { useRouter } from 'next/navigation';
import { AuthContext } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, ChevronRight, Sparkles, Mail, Lock } from 'lucide-react';
import api from '../api/client';
import { Button, Card, Input, Particles } from '../components/UI';
import styles from './login.module.css';

/**
 * LoginPage Protocol — v3.0 (Full Identity Management)
 * Implements password-based authentication and tactical registration flows.
 */
export default function LoginPage(): JSX.Element {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [mounted, setMounted] = useState<boolean>(false);
  const auth = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = auth?.user;

  useEffect(() => {
    if (user && mounted) {
      router.push('/discover');
    }
  }, [user, router, mounted]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username || !password || (isRegister && !email)) {
      setError("PLEASE_COMPLETE_ALL_IDENTITY_FIELDS");
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        await api.post('/auth/register', { username, password, email });
        setIsRegister(false);
        setError("REGISTRATION_SUCCESS_PLEASE_LOGIN");
      } else {
        const res = await api.post('/auth/login', { username, password });
        if (auth?.login) {
          auth.login(res.data.username);
          router.push('/discover');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "AUTHORIZATION_REFUSED_BY_CENTRAL_CORE");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className={styles.container} />;

  return (
    <div className={`${styles.container} rds-grid`}>
      <Particles count={30} minSize={2} maxSize={8} />
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.header}>
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.9, 1, 0.8],
                skewX: [0, 2, 0, -1, 0]
              }}
              transition={{ repeat: Infinity, duration: 4 }}
              className={styles.logoIcon}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                console.log("INITIALIZING_SENTRY_DIAGNOSTIC_TRIGGER...");
                throw new Error("SENTRY_CLIENT_UPLINK_TEST_SUCCESSFUL");
              }}
            >
              <Zap size={48} color="white" fill="white" />
            </motion.div>
            <h1 className={styles.title}>
              RONIN<span style={{ color: 'var(--primary-color)' }}>HUB</span>
            </h1>
            <p className={styles.subtitle}>
              NEURAL_IDENTITY_INTERFACE_V3.0
            </p>
          </div>

          <Card className={styles.cardOverrides}>
            <div className={styles.authLabel}>
              <Shield size={18} color="var(--primary-color)" />
              <span className={styles.authLabelText}>
                {isRegister ? 'INITIALIZING_NEW_ENTRY' : 'AUTHORIZATION_REQUIRED'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.form 
                key={isRegister ? 'reg' : 'login'}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSubmit} 
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
              >
                {error && <div className={styles.errorMsg}>{error}</div>}

                <div className={styles.inputGroup}>
                  <p className={styles.inputLabel}>PILOT_ID</p>
                  <Input 
                    placeholder="USERNAME..." 
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  />
                </div>

                {isRegister && (
                  <div className={styles.inputGroup}>
                    <p className={styles.inputLabel}>COMMS_CHANNEL</p>
                    <Input 
                      placeholder="EMAIL_ADDRESS..." 
                      value={email}
                      icon={<Mail size={16} />}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <p className={styles.inputLabel}>SECURITY_KEY</p>
                  <Input 
                    type="password"
                    placeholder="••••••••" 
                    icon={<Lock size={16} />}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit" 
                  fullWidth 
                  size="lg" 
                  disabled={loading}
                  icon={<ChevronRight size={20} />}
                >
                  {loading ? 'PROCESSING...' : isRegister ? 'REGISTER_IDENTITY' : 'INITIALIZE_SESSION'}
                </Button>
              </motion.form>
            </AnimatePresence>

            <div className={styles.toggleWrapper}>
              <span className={styles.toggleText}>
                {isRegister ? 'ALREADY_HAVE_IDENTITY?' : 'NEW_PILOT_DETECTED?'}
              </span>
              <button 
                className={styles.toggleBtn}
                onClick={() => { setIsRegister(!isRegister); setError(null); }}
              >
                {isRegister ? 'LOGIN_HERE' : 'SIGN_UP_HERE'}
              </button>
            </div>

            <div className={styles.footer}>
              <div className={styles.streamInfo}>
                <Sparkles size={14} />
                SECURE_ENCRYPTED_DATA_STREAM
              </div>
            </div>
          </Card>

          <p className={styles.copyright}>
            © 2026 DEEPMIND_SYSTEMS_INTL. ALL_RIGHTS_RESERVED.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
