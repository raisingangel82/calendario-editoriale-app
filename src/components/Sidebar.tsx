import React from 'react';
import { Calendar, ListChecks, BarChart3, Wrench } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  actionConfig: {
    icon: React.ElementType;
    onClick: () => void;
    label: string;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ actionConfig }) => {
  const { getActiveColor } = useTheme();
  const { icon: ActionIcon, onClick, label } = actionConfig;

  const navItems = [
    { icon: Calendar, label: 'Calendario', path: '/' },
    { icon: ListChecks, label: 'To-Do', path: '/todo' },
    { icon: BarChart3, label: 'Statistiche', path: '/stats' },
    { icon: Wrench, label: 'Utility', path: '/utility' },
  ];
  
  return (
    <aside className="relative w-14 bg-white dark:bg-gray-800 flex flex-col items-center flex-shrink-0 border-r border-gray-200 dark:border-gray-700 z-10">
      <div className="flex w-full flex-col items-center justify-start space-y-4 pt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end
            title={item.label}
            className="flex items-center justify-center w-12 h-12 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {({ isActive }) => (
              <item.icon 
                className={`h-6 w-6 transition-colors ${isActive ? getActiveColor('text') : 'text-gray-500 dark:text-gray-400'}`} 
              />
            )}
          </NavLink>
        ))}
      </div>
      
      <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center text-white rounded-full w-16 h-16 shadow-lg transition-all ${getActiveColor('bg')} hover:${getActiveColor('bg', '600')} border-4 border-gray-50 dark:border-gray-900 disabled:bg-gray-400`}
        disabled={label === 'Nessuna Azione'}
      >
        <ActionIcon size={32} />
      </button>
    </aside>
  );
};
