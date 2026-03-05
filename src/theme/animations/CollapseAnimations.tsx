import { ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

interface CollapsibleProps {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
}

const collapsibleVariants: Variants = {
  initial: {
    height: 0,
    opacity: 0,
  },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: 0.3,
        ease: [0.04, 0.62, 0.23, 0.98] as any,
      },
      opacity: {
        duration: 0.2,
        delay: 0.1,
      },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: 0.2,
        ease: [0.04, 0.62, 0.23, 0.98] as any,
      },
      opacity: {
        duration: 0.1,
      },
    },
  },
};

export function Collapsible({ children, isOpen, className }: CollapsibleProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={collapsibleVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={className}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AccordionItemProps {
  title: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const accordionContentVariants: Variants = {
  initial: {
    height: 0,
    opacity: 0,
  },
  animate: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.04, 0.62, 0.23, 0.98] as any,
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.04, 0.62, 0.23, 0.98] as any,
    },
  },
};

export function AccordionItem({
  title,
  children,
  isOpen,
  onToggle,
  className,
}: AccordionItemProps) {
  return (
    <div className={className}>
      <motion.button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        whileTap={{ scale: 0.98 }}
      >
        <span>{title}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          ▼
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={accordionContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function ToggleSwitch({ checked, onChange, label, className }: ToggleSwitchProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <motion.button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-slate-600'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}
