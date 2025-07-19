import { db } from '../firebase';
// Import aggiuntivi necessari per le nuove funzionalità
import { doc, setDoc, Timestamp, type DocumentData, writeBatch, collection } from 'firebase/firestore'; 
import { isSameDay, parse, startOfDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import type { Post } from '../types';

// Mappatura (invariata)
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': { date: 'Ora pubblicazione video', views: 'Visualizzazioni', title: 'Titolo video', description: 'Titolo video' },
    'instagram': { date: 'Orario di pubblicazione', views: 'Copertura', likes: 'Mi piace', comments: 'Commenti', description: 'Descrizione', postType: 'Tipo di post' },
    'facebook': { date: 'Orario di pubblicazione', views: 'Copertura', interactions: 'Reazioni, commenti e condivisioni', likes: 'Reazioni', comments: 'Commenti', shares: 'Condivisioni', title: 'Titolo', description: 'Descrizione' },
    'tiktok': { date: 'post time', views: 'Total views', likes: 'Total likes', comments: 'Total comments', shares: 'Total shares', description: 'Video title' }
};

// Funzioni helper (invariate)
const getValueFromRecord = (record: DocumentData, key: string | undefined): string | null => {
    if (!key) return null;
    const recordKey = Object.keys(record).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return recordKey ? record[recordKey] : null;
};

const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;
    if (platform === 'tiktok' && /^\d{1,2} \w+$/.test(dateStr)) {
        try {
            const parsed = parse(dateStr, 'd MMMM', new Date(), { locale: it });
            if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {}
    }
    const formatsToTry = [ 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'MMM d, yyyy', 'yyyy/MM/dd', 'MM-dd-yyyy', 'dd-MM-yyyy' ];
    for (const format of formatsToTry) {
        try {
            const parsed = parse(dateStr, format, new Date(), { locale: enUS });
            if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {}
    }
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    } catch (e) { return null; }
    return null;
};

/**
 * Processa i dati analitici da un file CSV, li abbina ai post esistenti e aggiorna/crea le metriche su Firestore.
 */
export const processAndMatchAnalytics = async (
    parsedData: DocumentData[], 
    platform: string, 
    existingPosts: Post[],
    userId: string,
    importStrategy: 'update_only' | 'create_new'
): Promise<{ updated: number, created: number, updatedPostsData: Map<string, any> }> => {
    const platformName = platform.toLowerCase();
    const mapper = platformCsvMappers[platformName];
    if (!mapper) {
        console.error(`Nessun mapper trovato per la piattaforma: ${platformName}`);
        return { updated: 0, created: 0, updatedPostsData: new Map() };
    }

    let updatedPostsCount = 0;
    let createdPostsCount = 0;
    const relevantDbPosts = existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName);
    const updatedPostsData = new Map<string, any>();

    // 1. MODIFICA: Inizializza un'operazione di scrittura batch
    const batch = writeBatch(db);

    console.log(`--- Inizio processo per la piattaforma: ${platformName.toUpperCase()} ---`);

    for (const record of parsedData) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);

        if (!csvDate) {
            console.warn("Riga saltata: data non valida o mancante.", record);
            continue;
        }
        
        const matchingPostIndex = relevantDbPosts.findIndex(p => {
            const firestoreDate = p.data ? (p.data as Timestamp).toDate() : null;
            return firestoreDate && isSameDay(startOfDay(firestoreDate), startOfDay(csvDate));
        });
        
        const cleanAndConvertToNumber = (value: string | null): number | null => {
            if (value === null || value === undefined) return null;
            const cleanedValue = String(value).replace(/[.,\s]/g, '');
            const numberValue = Number(cleanedValue);
            return isNaN(numberValue) ? null : numberValue;
        };
        
        // Estrai le metriche una sola volta
        const metricsData: { [key: string]: any } = {};
        const views = cleanAndConvertToNumber(getValueFromRecord(record, mapper.views));
        if (views !== null) metricsData.views = views;
        const likes = cleanAndConvertToNumber(getValueFromRecord(record, mapper.likes));
        if (likes !== null) metricsData.likes = likes;
        const comments = cleanAndConvertToNumber(getValueFromRecord(record, mapper.comments));
        if (comments !== null) metricsData.comments = comments;
        const shares = cleanAndConvertToNumber(getValueFromRecord(record, mapper.shares));
        if (shares !== null) metricsData.shares = shares;

        if (matchingPostIndex !== -1) {
            // --- LOGICA PER AGGIORNARE UN POST ESISTENTE ---
            const matchedPost = relevantDbPosts[matchingPostIndex];
            updatedPostsCount++;
            const postRef = doc(db, 'performanceMetrics', matchedPost.id);
            
            if (Object.keys(metricsData).length > 0) {
                 // 2. MODIFICA: Usa batch.set invece di accumulare promise
                 batch.set(postRef, metricsData, { merge: true });
                 updatedPostsData.set(matchedPost.id, metricsData);
            }
        } else if (importStrategy === 'create_new') {
            // --- 3. MODIFICA: LOGICA PER CREARE UN NUOVO POST ---
            createdPostsCount++;

            // ⚠️ ATTENZIONE: Sostituisci 'posts' con il nome reale della tua collezione principale di post!
            const newPostCollectionRef = collection(db, 'posts'); 
            const newPostRef = doc(newPostCollectionRef); // Crea un riferimento con un ID unico generato automaticamente

            // Prepara i dati per il nuovo documento Post
            const newPostData = {
                id: newPostRef.id,
                userId: userId,
                piattaforma: platformName,
                data: Timestamp.fromDate(csvDate),
                titolo: getValueFromRecord(record, mapper.title) || 'Titolo non disponibile',
                // Aggiungi qui altri campi necessari per un Post
            };
            batch.set(newPostRef, newPostData);

            // Aggiunge anche le metriche per il post appena creato
            if (Object.keys(metricsData).length > 0) {
                const newMetricsRef = doc(db, 'performanceMetrics', newPostRef.id);
                batch.set(newMetricsRef, metricsData);
            }
        }
    }
    
    // 4. MODIFICA: Esegue tutte le operazioni nel batch in una sola volta
    try {
        await batch.commit();
        console.log(`Batch di scrittura completato con ${updatedPostsCount} aggiornamenti e ${createdPostsCount} creazioni.`);
    } catch (error) {
        console.error("Errore durante l'esecuzione del batch di scrittura:", error);
    }
    
    console.log(`--- Analisi completata per ${platformName.toUpperCase()} ---`);
    return { updated: updatedPostsCount, created: createdPostsCount, updatedPostsData };
};