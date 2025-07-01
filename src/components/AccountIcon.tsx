import { useAuth } from '../context/AuthContext';

export const AccountIcon: React.FC = () => {
    const { user } = useAuth();

    const getInitials = (email: string | null) => {
        return email ? email.charAt(0).toUpperCase() : '?';
    };
    
    if (!user) {
        return null;
    }

    return (
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm" title={user.email || 'Account'}>
            {/* Logica aggiornata per mostrare l'immagine o le iniziali */}
            {user.photoURL ? (
                <img src={user.photoURL} alt="User Avatar" className="rounded-full w-full h-full object-cover" />
            ) : (
                <span>{getInitials(user.email)}</span>
            )}
        </div>
    );
};