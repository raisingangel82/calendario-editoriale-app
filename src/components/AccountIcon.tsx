import type { User } from 'firebase/auth'; // Corretto

interface AccountIconProps {
    user: User;
}

export const AccountIcon: React.FC<AccountIconProps> = ({ user }) => {
    const getInitials = (email: string | null) => {
        return email ? email.charAt(0).toUpperCase() : '?';
    };
    return (
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm" title={user.email || 'Account'}>
            {user.photoURL ? ( <img src={user.photoURL} alt="User Avatar" className="rounded-full w-full h-full object-cover" /> ) : ( <span>{getInitials(user.email)}</span> )}
        </div>
    );
};