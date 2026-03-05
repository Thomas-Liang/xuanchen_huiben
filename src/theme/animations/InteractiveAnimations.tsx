import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
}

const buttonVariants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  hover: {
    scale: 1.02,
    opacity: 1,
    transition: {
      duration: 0.15,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

export function AnimatedButton({
  children,
  className = '',
  variant = 'default',
  size = 'medium',
  ...props
}: AnimatedButtonProps) {
  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600',
    primary:
      'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700',
  };

  return (
    <motion.button
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className={`rounded-lg font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

interface PulseEffectProps {
  children: ReactNode;
  className?: string;
}

export function PulseEffect({ children, className }: PulseEffectProps) {
  return (
    <motion.div
      animate={{
        boxShadow: ['0 0 0 0 rgba(99, 102, 241, 0.4)', '0 0 0 10px rgba(99, 102, 241, 0)'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 1,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <motion.div className={`flex gap-1 ${className}`} initial="initial" animate="animate">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-2 h-2 bg-indigo-500 rounded-full"
          variants={{
            animate: {
              y: [0, -5, 0],
            },
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </motion.div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={`skeleton ${className}`}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonImage() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-3">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
