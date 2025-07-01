import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { PlatformFormModal } from './PlatformFormModal';
// ▼▼▼ IMPORT CORRETTO ▼▼▼
import { type PlatformData } from '../data/defaultPlatforms';

export const PlatformManager: React.FC = () => {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PlatformData | null>(null);

  useEffect(() => {
    if (user?.plan !== 'pro') {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "platforms"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userPlatforms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        icon: doc.data().icon,
        baseUrl: doc.data().baseUrl,
        isActive: doc.data().isActive ?? true, // Aggiungiamo un default anche qui per sicurezza
      } as PlatformData));
      setPlatforms(userPlatforms);
      setLoading(false);
    }, (error) => {
      console.error("Errore nel recupero delle piattaforme:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddNew = () => {
    setEditingPlatform(null);
    setIsModalOpen(true);
  };

  const handleEdit = (platform: PlatformData) => {
    setEditingPlatform(platform);
    setIsModalOpen(true);
  };

  const handleDelete = async (platformId: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa piattaforma?")) {
      await deleteDoc(doc(db, "platforms", platformId));
    }
  };

  const handleSave = async (platformData: Omit<PlatformData, 'id'>) => {
    if (!user) return;

    if (editingPlatform) {
      const platformRef = doc(db, "platforms", editingPlatform.id);
      await updateDoc(platformRef, platformData);
    } else {
      await addDoc(collection(db, "platforms"), { ...platformData, userId: user.uid });
    }
    setIsModalOpen(false);
  };
  
  if (user?.plan !== 'pro') {
    return null;
  }
  
  if (loading) {
    return <div>Caricamento piattaforme...</div>;
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Le tue Piattaforme Custom</h3>
        <button onClick={handleAddNew} className="flex items-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold">
          <Plus size={18} /> Aggiungi
        </button>
      </div>
      
      <div className="space-y-3">
        {platforms.length > 0 ? (
          platforms.map(platform => (
            <div key={platform.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{platform.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{platform.baseUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(platform)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Modifica"><Edit size={16} /></button>
                <button onClick={() => handleDelete(platform.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-500 transition-colors" title="Elimina"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">Non hai ancora aggiunto piattaforme personalizzate.</p>
        )}
      </div>

      {isModalOpen && (
        <PlatformFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          platformToEdit={editingPlatform}
        />
      )}
    </div>
  );
};