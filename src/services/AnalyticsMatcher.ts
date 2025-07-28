import { db } from '../firebase';
import { doc, setDoc, Timestamp, type DocumentData, writeBatch, collection } from 'firebase/firestore'; 
import { startOfDay, parse } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import type { Post } from '../types';

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

const isSimilar = (str1: string, str2: string): boolean => {
    if (!str1 || !str2) return false;
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
    const normalized1 = normalize(str1);
    const normalized2 = normalize(str2);
    if (normalized1.length === 0 || normalized2.length === 0) return false;
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return true;
    }
    const words1 = new Set(normalized1.split(' '));
    const words2 = new Set(normalized2.split(' '));
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    const similarity = intersection.size / union.size;
    return similarity > 0.5;
};


export const processAndMatchAnalytics = async (
    parsedData: DocumentData[], 
    platform: string, 
    existingPosts: Post[],
    userId: string,
    importStrategy: 'update_only' | 'create_new'
): Promise<{ updated: number, created: number, updatedPostsData: Map<string, any> }> => {

    console.log(`\n\n====================================================`);
    console.log(`[INFO] Inizio analisi per la piattaforma: "${platform.toUpperCase()}"`);
    console.log(`[INFO] Trovati ${parsedData.length} record nel file CSV.`);
    console.log(`====================================================\n`);

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
    
    const matchedDbPostIds = new Set<string>();
    const updatesForExistingPosts: { id: string, data: any }[] = [];
    const newPostsToCreate: { postData: any, metricsData: any }[] = [];

    for (const record of parsedData) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);

        if (!csvDate) {
            console.warn(`[WARN] ⚠️ Data non valida o illeggibile: "${rawDate}". Salto questa riga.`);
            continue;
        }

        const csvDescription = getValueFromRecord(record, mapper.description) || getValueFromRecord(record, mapper.title) || '';

        console.log(`\n----------------------------------------------------`);
        console.log(`[DEBUG] 🔍 Analizzo record CSV con data ${csvDate.toLocaleDateString('it-IT')}`);
        console.log(`        Testo: "${csvDescription.substring(0, 80)}..."`);
        
        const searchStartDate = new Date(csvDate.getTime() - (24 * 60 * 60 * 1000));
        const searchEndDate = new Date(csvDate.getTime() + (24 * 60 * 60 * 1000));

        const postsInDateRange = relevantDbPosts.filter(p => {
            const postDate = startOfDay(p.data.toDate());
            return postDate >= startOfDay(searchStartDate) &&
                   postDate <= startOfDay(searchEndDate) &&
                   !matchedDbPostIds.has(p.id);
        });

        let matchedPost: Post | null = null;
        if (postsInDateRange.length > 0) {
            matchedPost = postsInDateRange.find(p => isSimilar(p.descrizione || p.titolo, csvDescription)) || null;
            if (matchedPost) {
                console.log(`[SUCCESS] ✅ Corrispondenza trovata tramite testo nell'intervallo di date!`);
            } else if (postsInDateRange.length === 1) {
                matchedPost = postsInDateRange[0];
                console.log(`[SUCCESS] ✅ Corrispondenza trovata tramite fallback (unico post disponibile nell'intervallo).`);
            } else {
                console.log(`[FAIL] ❌ Trovati ${postsInDateRange.length} post nell'intervallo, ma nessuno corrisponde al testo.`);
            }
        } else {
             console.log(`[FAIL] ❌ Nessun post pianificato trovato nel DB nell'intervallo di +/- 1 giorno.`);
        }

        const cleanAndConvertToNumber = (value: string | null): number | null => {
            if (value === null || value === undefined) return null;
            const cleanedValue = String(value).replace(/[.,\s]/g, '');
            return isNaN(Number(cleanedValue)) ? null : Number(cleanedValue);
        };
        
        const metricsData: { [key: string]: any } = { userId: userId };
        const views = cleanAndConvertToNumber(getValueFromRecord(record, mapper.views));
        if (views !== null) metricsData.views = views;
        const likes = cleanAndConvertToNumber(getValueFromRecord(record, mapper.likes));
        if (likes !== null) metricsData.likes = likes;
        const comments = cleanAndConvertToNumber(getValueFromRecord(record, mapper.comments));
        if (comments !== null) metricsData.comments = comments;
        const shares = cleanAndConvertToNumber(getValueFromRecord(record, mapper.shares));
        if (shares !== null) metricsData.shares = shares;

        if (matchedPost) {
            if (!matchedPost.userId || matchedPost.userId !== userId) {
                 console.error(`[SECURITY_ERROR] per post ID ${matchedPost.id}: Atteso userId ${userId}, trovato ${matchedPost.userId || 'ASSENTE'}`);
            } else {
                console.log(`[INFO] ✅ Corrispondenza valida. Dati DB: Data ${matchedPost.data.toDate().toLocaleDateString('it-IT')}, Testo "${(matchedPost.descrizione || matchedPost.titolo).substring(0, 80)}..."`);
                matchedDbPostIds.add(matchedPost.id);
                if (Object.keys(metricsData).length > 1) {
                    updatesForExistingPosts.push({ id: matchedPost.id, data: metricsData });
                    updatedPostsData.set(matchedPost.id, metricsData);
                }
            }
        } else if (importStrategy === 'create_new') {
            const newPostData = { userId, piattaforma: platformName, data: Timestamp.fromDate(csvDate), titolo: getValueFromRecord(record, mapper.title) || 'Titolo non disponibile' };
            newPostsToCreate.push({ postData: newPostData, metricsData });
        }
    }
    
    // Creazione nuovi post (se presenti) - Mantenuta in un batch per efficienza
    const createdPostsWithMetrics: { id: string, metricsData: any }[] = [];
    if (newPostsToCreate.length > 0) {
        const creationBatch = writeBatch(db);
        for (const item of newPostsToCreate) {
            const newPostRef = doc(collection(db, 'contenuti'));
            creationBatch.set(newPostRef, { ...item.postData, id: newPostRef.id });
            createdPostsWithMetrics.push({ id: newPostRef.id, metricsData: item.metricsData });
        }
        try {
            await creationBatch.commit();
            createdPostsCount = newPostsToCreate.length;
            console.log(`[SUCCESS] Creati ${createdPostsCount} nuovi post.`);
        } catch (error) {
            console.error("❌ Errore durante la creazione batch dei nuovi contenuti:", error);
        }
    }

    // Aggiornamento/creazione delle metriche in modo individuale per isolare gli errori
    const allMetricWrites = [];
    
    // Aggiungo le metriche per i post esistenti
    for (const update of updatesForExistingPosts) {
        const metricsRef = doc(db, 'performanceMetrics', update.id);
        allMetricWrites.push(
            setDoc(metricsRef, update.data, { merge: true })
                .then(() => {
                    updatedPostsCount++;
                })
                .catch(error => {
                    console.error(`❌ ERRORE DI SCRITTURA ISOLATO per post ID [${update.id}]:`, error.message);
                })
        );
    }

    // Aggiungo le metriche per i nuovi post creati
    for (const newItem of createdPostsWithMetrics) {
        if (Object.keys(newItem.metricsData).length > 1) { 
            const newMetricsRef = doc(db, 'performanceMetrics', newItem.id);
            allMetricWrites.push(
                setDoc(newMetricsRef, newItem.metricsData)
                    .catch(error => {
                        console.error(`❌ ERRORE DI SCRITTURA ISOLATO per NUOVO post ID [${newItem.id}]:`, error.message);
                    })
            );
        }
    }

    // Eseguo tutte le promesse di scrittura in parallelo e attendo il completamento
    await Promise.all(allMetricWrites);
    
    console.log(`\n====================================================`);
    console.log(`[INFO] Analisi per "${platform.toUpperCase()}" completata.`);
    console.log(`       Post Aggiornati: ${updatedPostsCount}`);
    console.log(`       Nuovi Post Creati: ${createdPostsCount}`);
    console.log(`====================================================\n\n`);
    
    return { updated: updatedPostsCount, created: createdPostsCount, updatedPostsData };
};