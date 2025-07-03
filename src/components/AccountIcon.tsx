import { useAuth } from '../context/AuthContext';

// ▼▼▼ MODIFICA: Aggiungiamo 'className' per ricevere il colore del tema ▼▼▼
interface AccountIconProps {
  className?: string;
}

export const AccountIcon: React.FC<AccountIconProps> = ({ className }) => {
    const { user } = useAuth();

    const getInitials = (email: string | null) => {
        return email ? email.charAt(0).toUpperCase() : '?';
    };
    
    if (!user) {
        return null;
    }

    return (
        // ▼▼▼ MODIFICA: Rimosso 'bg-red-500' e aggiunto {className} ▼▼▼
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${className}`} 
          title={user.email || 'Account'}
        >
            {user.photoURL ? (
                <img src={user.photoURL} alt="User Avatar" className="rounded-full w-full h-full object-cover" />
            ) : (
                <span>{getInitials(user.email)}</span>
            )}
        </div>
    );
};