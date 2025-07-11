import { db } from '../firebase';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, format, parse, startOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Post } from '../types';

// Mappatura definitiva
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': { date: 'Ora pubblicazione video', views: 'Visualizzazioni', title: 'Titolo video', description: 'Titolo video' },
    'instagram': { date: 'Orario di pubblicazione', views: 'Copertura', likes: 'Mi piace', comments: 'Commenti', description: 'Descrizione', postType: 'Tipo di post' },
    'facebook': { date: 'Orario di pubblicazione', views: 'Copertura', interactions: 'Reazioni, commenti e condivisioni', likes: 'Reazioni', comments: 'Commenti', shares: 'Condivisioni', title: 'Titolo', description: 'Descrizione' },
    'tiktok': { date: 'post time', views: 'Total views', likes: 'Total likes', comments: 'Total comments', shares: 'Total shares', description: 'Video title' }
};

const getValueFromRecord = (record: DocumentData, key: string | undefined): string | null => {
    if (!key) return null;
    const recordKey = Object.keys(record).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return recordKey ? record[recordKey] : null;
};

const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;
    try {
        if (platform === 'youtube') return parse(dateStr, 'MMM d, yyyy', new Date(), { locale: enUS });
        if (platform === 'tiktok') {
            const monthMap: { [key: string]: number } = { 'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3, 'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7, 'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11 };
            const parts = dateStr.split(' ');
            if (parts.length === 2) {
                const day = parseInt(parts[0]);
                const month = monthMap[parts[1]?.toLowerCase()];
                const year = new Date().getFullYear(); 
                if (!isNaN(day) && month !== undefined) return new Date(year, month, day);
            }
        }
        if (platform === 'facebook' || platform === 'instagram') {
            if (dateStr.includes('/')) {
                 try { return parse(dateStr, 'MM/dd/yyyy', new Date()); } catch (e) {}
                 try { return parse(dateStr, 'dd/MM/yyyy', new Date()); } catch (e) {}
            }
        }
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    } catch (e) { return null; }
    return null;
};

export const processAndMatchAnalytics = async (
    parsedData: DocumentData[], 
    platform: string, 
    existingPosts: Post[],
    userId: string,
    importStrategy: 'update_only' | 'create_new'
): Promise<{ updated: number, created: number }> => {
    const platformName = platform.toLowerCase();
    const mapper = platformCsvMappers[platformName];
    if (!mapper) return { updated: 0, created: 0 };

    let updatedPostsCount = 0;
    let createdPostsCount = 0;
    let relevantDbPosts = existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName);
    const writePromises: Promise<void>[] = [];
    let tiktokDebugCount = 0;

    for (const record of parsedData) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);

        if (platformName === 'tiktok' && tiktokDebugCount < 5) {
            console.log(`--- TIKTOK DEBUG (Riga CSV ${tiktokDebugCount + 1}) ---`);
            console.log(`Stringa Grezza dal File: "${rawDate}"`);
            console.log(`Risultato del Parsing:`, csvDate); // Logga l'oggetto Date o null
        }
        
        if (!csvDate) continue;

        const viewsValue = getValueFromRecord(record, mapper.views);
        if (!viewsValue) continue; 
        
        const matchingPostIndex = relevantDbPosts.findIndex(p => {
            const firestoreDate = p.data ? (p.data as Timestamp).toDate() : null;
            if (!firestoreDate) return false;

            const match = isSameDay(startOfDay(firestoreDate), startOfDay(csvDate));

            if (platformName === 'tiktok' && tiktokDebugCount < 5 && relevantDbPosts.indexOf(p) < 3) {
                 console.log(`-> Tento match con post del: ${firestoreDate.toISOString()}`);
                 console.log(`-> Esito confronto: ${match}`);
            }
            return match;
        });

        if(platformName === 'tiktok') tiktokDebugCount++;
        
        const performanceData = { /* ... */ }; // (omesso per brevità)

        if (matchingPostIndex !== -1) {
            updatedPostsCount++;
            // ... (logica di aggiornamento omessa per brevità)
        } else if (importStrategy === 'create_new') {
            createdPostsCount++;
            // ... (logica di creazione omessa per brevità)
        }
    }

    // await Promise.all(writePromises); // Disabilitiamo la scrittura per il test
    console.log(`--- ANALISI DI DEBUG COMPLETATA. Match teorici trovati: ${updatedPostsCount} ---`);
    return { updated: updatedPostsCount, created: createdPostsCount };
};