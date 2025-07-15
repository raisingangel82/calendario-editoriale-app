import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export const SuccessPage = () => {
    const navigate = useNavigate();

    // Reindirizza automaticamente l'utente alla dashboard dopo 5 secondi
    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/');
        }, 5000);

        // Pulisce il timer se il componente viene smontato prima
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md">
                <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagamento Riuscito!</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                    Grazie! Il tuo piano è stato aggiornato a Pro. Ora hai accesso a tutte le funzionalità avanzate.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                    Verrai reindirizzato alla dashboard tra pochi secondi...
                </p>
                <Link to="/">
                    <button className="w-full mt-4 py-3 font-semibold rounded-lg transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                        Torna alla Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
};