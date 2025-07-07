import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  footer?: ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, children, title, footer }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      {/* *** CORREZIONE CHIAVE: Layout Flessibile e Altezza Massima *** */}
      {/* Aggiunto flex, flex-col e max-h-[90vh] per vincolare l'altezza alla viewport */}
      <div
        className="relative m-4 flex w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl transition-all duration-300 ease-in-out dark:bg-gray-800 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (non si espande) */}
        <div className="flex-shrink-0 flex items-start justify-between border-b border-gray-200 p-4 dark:border-gray-600">
          {title && <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>}
          <button
            type="button"
            className="-mt-1 -mr-1 ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg className="h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
          </button>
        </div>

        {/* *** CORREZIONE CHIAVE: Area Contenuto Scrollabile *** */}
        {/* Aggiunto flex-1 (per espandersi) e overflow-y-auto (per lo scroll) */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer (non si espande) */}
        {footer && (
          <div className="flex-shrink-0 flex items-center justify-end space-x-2 rounded-b border-t border-gray-200 p-4 dark:border-gray-600">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
