import React from 'react';
import { Calendar, ListChecks, BarChart3, Wrench } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface BottomBarProps {
  actionConfig: {
    icon: React.ElementType;
    onClick: () => void;
    label: string;
  };
}

export const BottomBar: React.FC<BottomBarProps> = ({ actionConfig }) => {
  const { getActiveColor } = useTheme();
  const { icon: ActionIcon, onClick, label } = actionConfig;
  
  const navItems = [
    { icon: Calendar, label: 'Calendario', path: '/' },
    { icon: ListChecks, label: 'To-Do', path: '/todo' },
    { type: 'action', icon: ActionIcon, action: onClick, label: label },
    { icon: BarChart3, label: 'Statistiche', path: '/stats' },
    { icon: Wrench, label: 'Utility', path: '/utility' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 grid grid-cols-5 items-center z-40">
      {navItems.map((item, index) => {
        if (item.type === 'action') {
          return (
            <div key={index} className="flex justify-center">
              <button 
                onClick={item.action} 
                aria-label={item.label} 
                // MODIFICA: Allineata la classe del bordo per il dark mode
                className={`flex items-center justify-center text-white rounded-full w-16 h-16 -mt-8 border-4 border-white dark:border-gray-900 shadow-lg transition-all ${getActiveColor('bg')} hover:${getActiveColor('bg', '600')} disabled:bg-gray-400`}
                disabled={item.label === 'Nessuna Azione'}
              >
                <item.icon size={32} />
              </button>
            </div>
          );
        }
        return (
          <NavLink
            key={index}
            to={item.path!}
            end
            aria-label={item.label}
            className="flex items-center justify-center h-full w-full"
          >
            {({ isActive }) => (
              <div className="flex items-center justify-center w-12 h-12 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <item.icon 
                  className={`h-6 w-6 transition-colors ${isActive ? getActiveColor('text') : 'text-gray-500 dark:text-gray-400'}`} 
                />
              </div>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
