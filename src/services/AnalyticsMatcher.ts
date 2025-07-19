import { db } from '../firebase';
import { doc, setDoc, Timestamp, type DocumentData, writeBatch, collection } from 'firebase/firestore'; 
import { isSameDay, parse, startOfDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import type { Post } from '../types';

// Mappatura delle colonne CSV per ogni piattaforma
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': { date: 'Ora pubblicazione video', views: 'Visualizzazioni', title: 'Titolo video', description: 'Titolo video' },
    'instagram': { date: 'Orario di pubblicazione', views: 'Copertura', likes: 'Mi piace', comments: 'Commenti', description: 'Descrizione', postType: 'Tipo di post' },
    'facebook': { date: 'Orario di pubblicazione', views: 'Copertura', interactions: 'Reazioni, commenti e condivisioni', likes: 'Reazioni', comments: 'Commenti', shares: 'Condivisioni', title: 'Titolo', description: 'Descrizione' },
    'tiktok': { date: 'post time', views: 'Total views', likes: 'Total likes', comments: 'Total comments', shares: 'Total shares', description: 'Video title' }
};

// Funzione helper per estrarre un valore da un record
const getValueFromRecord = (record: DocumentData, key: string | undefined): string | null => {
    if (!key) return null;
    const recordKey = Object.keys(record).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return recordKey ? record[recordKey] : null;
};

// Funzione helper per analizzare le date
const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;
    if (platform === 'tiktok' && /^\d{1,2} \w+$/.test(dateStr)) {
        try { const parsed = parse(dateStr, 'd MMMM', new Date(), { locale: it }); if (!isNaN(parsed.getTime())) return parsed; } catch (e) {}
    }
    const formatsToTry = [ 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'MMM d, yyyy', 'yyyy/MM/dd', 'MM-dd-yyyy', 'dd-MM-yyyy' ];
    for (const format of formatsToTry) {
        try { const parsed = parse(dateStr, format, new Date(), { locale: enUS }); if (!isNaN(parsed.getTime())) return parsed; } catch (e) {}
    }
    try { const date = new Date(dateStr); if (!isNaN(date.getTime())) return date; } catch (e) { return null; }
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
    
    const updatesForExistingPosts: { ref: any, data: any }[] = [];
    const newPostsToCreate: { postData: any, metricsData: any }[] = [];

    console.log(`--- Inizio processo per la piattaforma: ${platformName.toUpperCase()} ---`);

    for (const record of parsedData) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);
        if (!csvDate) continue;

        const matchingPostIndex = relevantDbPosts.findIndex(p => isSameDay(startOfDay(p.data.toDate()), startOfDay(csvDate)));
        
        const cleanAndConvertToNumber = (value: string | null): number | null => {
            if (value === null || value === undefined) return null;
            const cleanedValue = String(value).replace(/[.,\s]/g, '');
            return isNaN(Number(cleanedValue)) ? null : Number(cleanedValue);
        };
        
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
            const matchedPost = relevantDbPosts[matchingPostIndex];

            // --- LOG DI DEBUG PER VERIFICARE I PERMESSI ---
            // Controlla se l'ID del proprietario del post corrisponde all'utente che sta importando.
            console.log(
                `[Verifica Permessi] Post ID: ${matchedPost.id}`,
                `| Proprietario nel DB: ${matchedPost.userId}`, 
                `| Utente che importa: ${userId}`
            );
            // ---------------------------------------------

            if (Object.keys(metricsData).length > 0) {
                const postRef = doc(db, 'performanceMetrics', matchedPost.id);
                updatesForExistingPosts.push({ ref: postRef, data: metricsData });
                updatedPostsData.set(matchedPost.id, metricsData);
            }
        } else if (importStrategy === 'create_new') {
            const newPostData = {
                userId: userId,
                piattaforma: platformName,
                data: Timestamp.fromDate(csvDate),
                titolo: getValueFromRecord(record, mapper.title) || 'Titolo non disponibile',
            };
            newPostsToCreate.push({ postData: newPostData, metricsData });
        }
    }
    
    // FASE 1: Crea i nuovi documenti 'contenuti'
    const newPostsWithIds: { id: string, metricsData: any }[] = [];
    if (newPostsToCreate.length > 0) {
        const creationBatch = writeBatch(db);
        for (const item of newPostsToCreate) {
            const newPostRef = doc(collection(db, 'contenuti')); // Usa la collezione corretta 'contenuti'
            creationBatch.set(newPostRef, { ...item.postData, id: newPostRef.id });
            newPostsWithIds.push({ id: newPostRef.id, metricsData: item.metricsData });
        }
        try {
            await creationBatch.commit();
            createdPostsCount = newPostsToCreate.length;
            console.log(`${createdPostsCount} nuovi contenuti creati con successo.`);
        } catch (error) {
            console.error("Errore durante la creazione dei nuovi contenuti:", error);
            return { updated: 0, created: 0, updatedPostsData: new Map() };
        }
    }

    // FASE 2: Aggiorna i post esistenti e aggiunge le metriche per i nuovi
    const metricsBatch = writeBatch(db);
    for (const update of updatesForExistingPosts) {
        metricsBatch.set(update.ref, update.data, { merge: true });
    }
    for (const newItem of newPostsWithIds) {
        if (Object.keys(newItem.metricsData).length > 0) {
            const newMetricsRef = doc(db, 'performanceMetrics', newItem.id);
            metricsBatch.set(newMetricsRef, newItem.metricsData);
        }
    }

    try {
        await metricsBatch.commit();
        updatedPostsCount = updatesForExistingPosts.length;
        console.log(`Batch metriche completato: ${updatedPostsCount} aggiornamenti, ${newPostsWithIds.length} nuove metriche.`);
    } catch (error) {
        console.error("Errore durante l'aggiornamento/creazione delle metriche:", error);
    }
    
    console.log(`--- Analisi completata per ${platformName.toUpperCase()} ---`);
    return { updated: updatedPostsCount, created: createdPostsCount, updatedPostsData };
};