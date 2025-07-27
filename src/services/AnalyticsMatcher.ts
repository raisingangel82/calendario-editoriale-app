import { db } from '../firebase';
import { doc, setDoc, Timestamp, type DocumentData, writeBatch, collection } from 'firebase/firestore'; 
import { isSameDay, parse, startOfDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import type { Post } from '../types';

// Mappatura delle colonne CSV per ogni piattaforma (INVARIATO)
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': { date: 'Ora pubblicazione video', views: 'Visualizzazioni', title: 'Titolo video', description: 'Titolo video' },
    'instagram': { date: 'Orario di pubblicazione', views: 'Copertura', likes: 'Mi piace', comments: 'Commenti', description: 'Descrizione', postType: 'Tipo di post' },
    'facebook': { date: 'Orario di pubblicazione', views: 'Copertura', interactions: 'Reazioni, commenti e condivisioni', likes: 'Reazioni', comments: 'Commenti', shares: 'Condivisioni', title: 'Titolo', description: 'Descrizione' },
    'tiktok': { date: 'post time', views: 'Total views', likes: 'Total likes', comments: 'Total comments', shares: 'Total shares', description: 'Video title' }
};

// Funzione helper per estrarre un valore da un record (INVARIATO)
const getValueFromRecord = (record: DocumentData, key: string | undefined): string | null => {
    if (!key) return null;
    const recordKey = Object.keys(record).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return recordKey ? record[recordKey] : null;
};

// Funzione helper per analizzare le date (INVARIATO)
const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;
    if (platform === 'tiktok' && /^\d{1,2} \w+$/.test(dateStr)) {
        try { const parsed = parse(dateStr, 'd MMMM', new Date(), { locale: it }); if (!isNaN(parsed.getTime())) return parsed; } catch (e) {}
    }
    const formatsToTry = [ 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'MMM d, yyyy', 'yyyy/MM/dd', 'MM-dd-yyyy', 'dd-MM-yyyy' ];
    for (const format of formatsToTry) {
        try { const parsed = parse(dateStr.split(' ')[0], format, new Date(), { locale: enUS }); if (!isNaN(parsed.getTime())) return parsed; } catch (e) {}
    }
    try { const date = new Date(dateStr); if (!isNaN(date.getTime())) return date; } catch (e) { return null; }
    return null;
};

// NUOVA FUNZIONE: Confronta due stringhe di testo in modo flessibile.
// Serve per distinguere post diversi pubblicati nello stesso giorno.
const isSimilar = (str1: string, str2: string): boolean => {
    if (!str1 || !str2) return false;

    const normalize = (str: string) => 
        str.toLowerCase()
           .replace(/[^\w\s]/gi, '') // Rimuove punteggiatura
           .replace(/\s+/g, ' ')      // Normalizza gli spazi
           .trim();

    const normalized1 = normalize(str1);
    const normalized2 = normalize(str2);

    if (normalized1.length === 0 || normalized2.length === 0) return false;
    
    // Per essere più robusto, considera una lunghezza minima per il confronto.
    // Un titolo di 30 caratteri deve corrispondere per almeno 15.
    const minLength = Math.min(normalized1.length, normalized2.length);
    if (minLength < 15) {
      return normalized1.includes(normalized2) || normalized2.includes(normalized1);
    }

    // Controlla se la stringa più corta è contenuta in quella più lunga.
    if (normalized1.length < normalized2.length) {
        return normalized2.includes(normalized1);
    } else {
        return normalized1.includes(normalized2);
    }
};

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
    
    // MODIFICA: Set per tenere traccia dei post del DB già abbinati ed evitare doppioni.
    const matchedDbPostIds = new Set<string>();

    const updatesForExistingPosts: { ref: any, data: any }[] = [];
    const newPostsToCreate: { postData: any, metricsData: any }[] = [];

    for (const record of parsedData) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);
        if (!csvDate) continue;

        // LOGICA DI MATCH MODIFICATA: Ora è più robusta.
        // -------------------------------------------------------------
        const csvDescription = getValueFromRecord(record, mapper.description) || getValueFromRecord(record, mapper.title) || '';

        // Fase 1: Cerca una corrispondenza di alta precisione (stesso giorno + testo simile).
        let matchedPost = relevantDbPosts.find(p => 
            !matchedDbPostIds.has(p.id) && // Non deve essere già stato abbinato
            isSameDay(startOfDay(p.data.toDate()), startOfDay(csvDate)) &&
            isSimilar(p.descrizione || p.titolo, csvDescription)
        );

        // Fase 2 (Fallback): Se non trova un match con il testo, e c'è UN SOLO post
        // pianificato per quel giorno, lo abbina. Questo gestisce i casi di post singoli
        // in cui il testo potrebbe essere leggermente diverso.
        if (!matchedPost) {
            const postsOnThisDay = relevantDbPosts.filter(p => 
                isSameDay(startOfDay(p.data.toDate()), startOfDay(csvDate)) && 
                !matchedDbPostIds.has(p.id)
            );
            if (postsOnThisDay.length === 1) {
                matchedPost = postsOnThisDay[0];
            }
        }
        // -------------------------------------------------------------

        const cleanAndConvertToNumber = (value: string | null): number | null => {
            if (value === null || value === undefined) return null;
            const cleanedValue = String(value).replace(/[.,\s]/g, '');
            return isNaN(Number(cleanedValue)) ? null : Number(cleanedValue);
        };
        
        const metricsData: { [key: string]: any } = {
            userId: userId,
        };
        const views = cleanAndConvertToNumber(getValueFromRecord(record, mapper.views));
        if (views !== null) metricsData.views = views;
        const likes = cleanAndConvertToNumber(getValueFromRecord(record, mapper.likes));
        if (likes !== null) metricsData.likes = likes;
        const comments = cleanAndConvertToNumber(getValueFromRecord(record, mapper.comments));
        if (comments !== null) metricsData.comments = comments;
        const shares = cleanAndConvertToNumber(getValueFromRecord(record, mapper.shares));
        if (shares !== null) metricsData.shares = shares;

        if (matchedPost) {
            // MODIFICA: Una volta trovato un match, lo "blocchiamo" per non riutilizzarlo.
            matchedDbPostIds.add(matchedPost.id);

            if (Object.keys(metricsData).length > 1) {
                const postRef = doc(db, 'performanceMetrics', matchedPost.id);
                updatesForExistingPosts.push({ ref: postRef, data: metricsData });
                updatedPostsData.set(matchedPost.id, metricsData);
            }
        } else if (importStrategy === 'create_new') {
            // Questa parte per la creazione di nuovi post rimane INVARIATA.
            const newPostData = {
                userId: userId,
                piattaforma: platformName,
                data: Timestamp.fromDate(csvDate),
                titolo: getValueFromRecord(record, mapper.title) || 'Titolo non disponibile',
            };
            newPostsToCreate.push({ postData: newPostData, metricsData });
        }
    }
    
    // Il resto del file, con la scrittura batch su Firebase, è INVARIATO.
    // ...
    const newPostsWithIds: { id: string, metricsData: any }[] = [];
    if (newPostsToCreate.length > 0) {
        // ...
    }

    const metricsBatch = writeBatch(db);
    for (const update of updatesForExistingPosts) {
        metricsBatch.set(update.ref, update.data, { merge: true });
    }
    for (const newItem of newPostsWithIds) {
        if (Object.keys(newItem.metricsData).length > 1) { 
            const newMetricsRef = doc(db, 'performanceMetrics', newItem.id);
            metricsBatch.set(newMetricsRef, newItem.metricsData);
        }
    }

    try {
        await metricsBatch.commit();
        updatedPostsCount = updatesForExistingPosts.length;
        console.log(`✅ Batch metriche completato: ${updatedPostsCount} aggiornamenti e ${newPostsWithIds.length} nuove metriche elaborate.`);
    } catch (error) {
        console.error("❌ Errore durante l'aggiornamento/creazione delle metriche:", error);
    }
    
    return { updated: updatedPostsCount, created: createdPostsCount, updatedPostsData };
};