import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../contexts/ThemeContext'; // Importa il context del tema
import { app } from '../firebase'; // Importa l'istanza app di firebase

// Componente per una singola card di un piano
const PlanCard = ({ title, price, description, features, isCurrent, onSelect, isLoading, isRecommended }) => {
    const { getActiveColor } = useTheme(); // Usa il theme hook

    // Applica dinamicamente il colore del tema
    const recommendedBorder = isRecommended ? `border-2 ${getActiveColor('border')}` : 'border-gray-200 dark:border-gray-700';
    const recommendedBadgeBg = isRecommended ? getActiveColor('bg') : 'bg-gray-500';
    const buttonClasses = `w-full mt-8 py-3 font-semibold rounded-lg transition-colors ${isCurrent ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-default' : isRecommended ? `${getActiveColor('bg')} text-white hover:opacity-90` : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-black hover:bg-gray-900'}`;

    return (
        <div className={`p-8 rounded-lg border transition-transform hover:scale-[1.02] shadow-lg ${recommendedBorder}`}>
            {isRecommended && <div className="text-center mb-4"><span className={`px-3 py-1 text-xs font-bold text-white ${recommendedBadgeBg} rounded-full`}>Consigliato</span></div>}
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center mt-2">{description}</p>
            <div className="text-center my-6">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">{price}</span>
                {price !== 'Gratis' && <span className="text-gray-500">/mese</span>}
            </div>
            <ul className="space-y-3 text-sm">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                        <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                ))}
            </ul>
            <button onClick={onSelect} disabled={isCurrent || isLoading} className={buttonClasses}>
                {isLoading ? 'Caricamento...' : isCurrent ? 'Piano Attuale' : `Fai l'Upgrade`}
            </button>
        </div>
    );
};

export const UpgradePage = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUpgradeClick = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Specifica la regione corretta quando si ottiene l'istanza delle funzioni
            const functions = getFunctions(app, 'europe-west1');
            const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
            
            // ID del prezzo del piano Pro su Stripe
            const priceId = 'price_1Rl7lqGMvHfHEDrIgdl2mghz'; 

            // Invia l'ID del prezzo e l'URL di origine corrente al backend
            const result = await createStripeCheckout({
                priceId: priceId,
                origin: window.location.origin,
            });
            
            // La funzione di backend restituisce direttamente un URL a cui reindirizzare
            // @ts-ignore
            const { url } = result.data;

            if (url) {
                window.location.href = url;
            } else {
                 throw new Error("URL di checkout non ricevuto.");
            }

        } catch (err) {
            console.error("Errore nel processo di pagamento:", err);
            setError("Si è verificato un errore. Riprova.");
            setIsLoading(false);
        }
    };

    const plans = [
        {
            title: 'Gratuito',
            price: 'Gratis',
            description: 'Perfetto per iniziare',
            features: ['1 Progetto', 'Calendario Interattivo', 'Statistiche di produzione', 'Importazione manuale Analytics'],
            isCurrent: !user?.plan || user?.plan === 'free',
        },
        {
            title: 'Pro',
            price: '€4.99',
            description: 'Per creator strategici',
            features: ['Tutto del piano Gratuito', 'Progetti illimitati', 'Analisi Strategica con AI', 'Esportazione dati e Duplicazione post'],
            isCurrent: user?.plan === 'pro',
            onSelect: handleUpgradeClick,
            isRecommended: true,
        },
    ];

    return (
        <div className="p-4 sm:p-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Fai l'Upgrade al Piano Pro</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">Sblocca tutto il potenziale di AuthorFlow con progetti illimitati e l'analisi strategica basata su AI.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {plans.map(plan => (
                    <PlanCard 
                        key={plan.title}
                        {...plan}
                        isLoading={isLoading && plan.title === 'Pro'}
                    />
                ))}
            </div>
            {error && <p className="text-center text-red-500 mt-8">{error}</p>}
        </div>
    );
};
