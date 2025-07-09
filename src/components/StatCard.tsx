import React from 'react';

interface CardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<CardProps> = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-in ${className}`}>
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-3 mb-4">
            <Icon size={20}/> {title}
        </h3>
        {children}
    </div>
);