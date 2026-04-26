"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface CustomDropdownProps {
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  width?: string;
  compact?: boolean;
  onOpenStateChange?: (isOpen: boolean) => void;
}

export default function CustomDropdown({ value, onChange, options, placeholder = 'SELECT', width = '100%', compact = false, onOpenStateChange }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  useEffect(() => {
    onOpenStateChange?.(isOpen);
  }, [isOpen, onOpenStateChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width, zIndex: 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', 
          padding: compact ? '8px 12px' : '12px 20px', 
          borderRadius: compact ? '8px' : '14px', 
          background: 'var(--hover-bg)', 
          color: 'var(--text-main)', 
          fontSize: compact ? '0.7rem' : '0.8rem', 
          fontWeight: 800, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          border: '1px solid var(--glass-border)', 
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel.toUpperCase()}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={compact ? 12 : 16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: compact ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: compact ? -10 : 10, scale: 0.95 }}
            style={{ 
              position: 'absolute', 
              [compact ? 'bottom' : 'top']: 'calc(100% + 6px)', 
              left: 0, 
              right: 0, 
              background: 'var(--bg-deep)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: compact ? '10px' : '16px',
              padding: '6px', 
              boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(30px)', 
              zIndex: 1000,
              maxHeight: '250px',
              overflowY: 'auto'
            }}
            className="custom-scrollbar"
          >
            {options.map((opt) => (
              <div 
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                style={{ 
                  padding: compact ? '8px 12px' : '12px 16px', 
                  borderRadius: compact ? '6px' : '10px', 
                  fontSize: compact ? '0.7rem' : '0.8rem', 
                  fontWeight: 800,
                  color: value === opt.value ? 'var(--primary-color)' : 'var(--text-main)',
                  background: value === opt.value ? 'var(--hover-bg)' : 'transparent',
                  cursor: 'pointer', 
                  transition: '0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {value === opt.value && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-color)', boxShadow: '0 0 10px var(--primary-color)' }} />}
                {opt.label.toUpperCase()}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
