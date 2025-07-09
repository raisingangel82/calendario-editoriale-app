import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, format, parse } from 'date-fns';
import type { Post } from '../types';

// Mappa per la struttura dei file CSV
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': {
        date: 'Ora pubblicazione video',
        views: 'Visualizzazioni',
    },
    'instagram': {
        date: 'Orario di pubblicazione',
        views: 'Copertura',
        likes: 'Mi piace',
        comments: 'Commenti',
    },
    'facebook': {
        date: 'Orario di pubblicazione',
        views: 'Visualizzazioni',
        likes: 'Mi piace',
        comments: 'Commenti',
    },
    'tiktok': {
        date: 'Date',
        views: 'Video Views',
        likes: 'Likes',
        comments: 'Comments',
    }
};

// Funzione di parsing della data
const parseDate = (dateStr: string, platform: string): Date | null => {
    if (!dateStr) return null;

    try {
        // Logica per TikTok (formato "30 giugno")
        if (platform === 'tiktok') {
            const monthMap: { [key: string]: number } = {
                'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3, 'maggio': 4, 'giugno': 5,
                'luglio': 6, 'agosto': 7, 'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
            };
            const parts = dateStr.split(' ');
            const day = parseInt(parts[0]);
            const month = monthMap[parts[1]?.toLowerCase()];
            if (!isNaN(day) && month !== undefined) {
                return new Date(new Date().getFullYear(), month, day);
            }
        }
        
        // CORREZIONE FINALE: Usa il formato MM/dd/yyyy per Facebook e Instagram
        if (platform === 'facebook' || platform === 'instagram') {
            if (dateStr.includes('/')) {
                // Formato corretto per date come "06/17/2025" (Mese/Giorno/Anno)
                return parse(dateStr, 'MM/dd/yyyy HH:mm', new Date());
            }
        }

        // Logica per YouTube e altri formati standard
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date;
        }

    } catch (e) {
        console.error(`Errore nel parsing della data "${dateStr}" per la piattaforma ${platform}`, e);
        return null;
    }

    return null;
};


// Funzione principale per l'abbinamento dei dati
export const processAndMatchAnalytics = async (
    parsedData: DocumentData[], 
    platform: string, 
    existingPosts: Post[]
): Promise<number> => {

    const platformName = platform.toLowerCase();
    const mapper = platformCsvMappers[platformName];
    if (!mapper) {
        console.warn(`Nessuna mappatura trovata per la piattaforma '${platformName}'`);
        return 0;
    }

    let updatedPostsCount = 0;
    let relevantDbPosts = existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName);
    const updatePromises: Promise<void>[] = [];

    console.log(`--- Inizio import per '${platformName}' con ${relevantDbPosts.length} post candidati. ---`);

    for (const record of parsedData) {
        const csvDateStr = record[mapper.date];
        const csvDate = parseDate(csvDateStr, platformName);
        
        if (!csvDate) {
            continue;
        }
        
        const matchingPostIndex = relevantDbPosts.findIndex(p => {
          if (!p.data) return false;
          const dbPostDate = (p.data as Timestamp).toDate();
          return isSameDay(dbPostDate, csvDate);
        });

        if (matchingPostIndex !== -1) {
            const matchingPost = relevantDbPosts.splice(matchingPostIndex, 1)[0];
            updatedPostsCount++;
            console.log(`✅ CORRISPONDENZA TROVATA per ${platformName}: "${matchingPost.titolo || 'Senza Titolo'}" in data ${format(csvDate, 'yyyy-MM-dd')}`);
            
            const postRef = doc(db, 'contenuti', matchingPost.id);
            const existingMetrics = matchingPost.performance || {};
            
            const newMetrics: { [key: string]: any } = { lastUpdated: serverTimestamp() };
            if(mapper.views && record[mapper.views] !== undefined) newMetrics.views = parseInt(record[mapper.views], 10) || 0;
            if(mapper.likes && record[mapper.likes] !== undefined) newMetrics.likes = parseInt(record[mapper.likes], 10) || 0;
            if(mapper.comments && record[mapper.comments] !== undefined) newMetrics.comments = parseInt(record[mapper.comments], 10) || 0;
            if(mapper.shares && record[mapper.shares] !== undefined) newMetrics.shares = parseInt(record[mapper.shares], 10) || 0;
            
            const mergedPerformanceData = { ...existingMetrics, ...newMetrics };
            updatePromises.push(updateDoc(postRef, { performance: mergedPerformanceData }));

        } else {
            console.log(`❌ NESSUNA CORRISPONDENZA DISPONIBILE nel DB per un post del ${format(csvDate, 'yyyy-MM-dd')}.`);
        }
    }

    try {
        await Promise.all(updatePromises);
    } catch (error) {
        console.error(`Errore durante l'aggiornamento di uno o più documenti per ${platformName}:`, error);
    }

    console.log(`--- Fine import per '${platformName}'. Trovate e processate ${updatedPostsCount} corrispondenze. ---`);
    return updatedPostsCount;
};