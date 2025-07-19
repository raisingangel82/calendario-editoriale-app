import { db } from '../firebase';
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
        try { const parsed = parse(dateStr, 'd MMMM', new Date(), { locale: it }); if (!isNaN(parsed.getTime())) return parsed; } catch (e) {}
    }
    const formatsToTry = [ 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'MMM d, yyyy', 'yyyy/MM/dd', 'MM-dd-yyyy', 'dd-MM-yyyy' ];
    for (const format of formatsToTry) {
        try { const parsed = parse(dateStr, format, new Date(), { locale: enUS }); if (!isNaN(parsed.getTime())) return parsed; } catch (e) {}
    }
    try { const date = new Date(dateStr); if (!isNaN(date.getTime())) return date; } catch (e) { return null; }
    return null;
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
    if (!mapper) return { updated: 0, created: 0, updatedPostsData: new Map() };

    let updatedPostsCount = 0;
    let createdPostsCount = 0;
    const relevantDbPosts = existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName);
    const updatedPostsData = new Map<string, any>();
    
    const updatesForExistingPosts: { ref: any, data: any }[] = [];
    const newPostsToCreate: { postData: any, metricsData: any }[] = [];

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
        // ... (altre metriche)
        
        if (matchingPostIndex !== -1) {
            const matchedPost = relevantDbPosts[matchingPostIndex];
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
    
    // FASE 1: CREAZIONE CONTENUTI
    const newPostsWithIds: { id: string, metricsData: any }[] = [];
    if (newPostsToCreate.length > 0) {
        const creationBatch = writeBatch(db);
        for (const item of newPostsToCreate) {
            const newPostRef = doc(collection(db, 'contenuti'));
            creationBatch.set(newPostRef, { ...item.postData, id: newPostRef.id });
            newPostsWithIds.push({ id: newPostRef.id, metricsData: item.metricsData });
        }
        try {
            await creationBatch.commit();
            createdPostsCount = newPostsToCreate.length;
            console.log(`✅ FASE 1: ${createdPostsCount} nuovi contenuti creati.`);
        } catch (error) {
            console.error("❌ ERRORE FASE 1 (Creazione Contenuti):", error);
            return { updated: 0, created: 0, updatedPostsData: new Map() };
        }
    }

    // FASE 2: AGGIORNAMENTO METRICHE ESISTENTI
    if (updatesForExistingPosts.length > 0) {
        const updateMetricsBatch = writeBatch(db);
        for (const update of updatesForExistingPosts) {
            updateMetricsBatch.set(update.ref, update.data, { merge: true });
        }
        try {
            await updateMetricsBatch.commit();
            updatedPostsCount = updatesForExistingPosts.length;
            console.log(`✅ FASE 2: ${updatedPostsCount} metriche esistenti aggiornate.`);
        } catch (error) {
            console.error("❌ ERRORE FASE 2 (Aggiornamento Metriche):", error);
        }
    } else {
        updatedPostsCount = 0;
    }

    // FASE 3: CREAZIONE NUOVE METRICHE
    if (newPostsWithIds.length > 0) {
        const createMetricsBatch = writeBatch(db);
        for (const newItem of newPostsWithIds) {
            if (Object.keys(newItem.metricsData).length > 0) {
                const newMetricsRef = doc(db, 'performanceMetrics', newItem.id);
                createMetricsBatch.set(newMetricsRef, newItem.metricsData);
            }
        }
        try {
            await createMetricsBatch.commit();
            console.log(`✅ FASE 3: ${newPostsWithIds.length} nuove metriche create.`);
        } catch (error) {
            console.error("❌ ERRORE FASE 3 (Creazione Nuove Metriche):", error);
        }
    }

    return { updated: updatedPostsCount, created: createdPostsCount, updatedPostsData };
};