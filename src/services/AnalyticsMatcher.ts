import { db } from '../firebase';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, format, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Post } from '../types';

// --- MODIFICA: Aggiornata la mappatura di TikTok con i nuovi campi ---
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': {
        date: 'Ora pubblicazione video',
        views: 'Visualizzazioni',
        title: 'Titolo video',
        description: 'Titolo video'
    },
    'instagram': {
        date: 'Orario di pubblicazione',
        views: 'Copertura',
        likes: 'Mi piace',
        comments: 'Commenti',
        description: 'Descrizione',
        postType: 'Tipo di post'
    },
    'facebook': {
        date: 'Orario di pubblicazione',
        views: 'Copertura',
        interactions: 'Reazioni, commenti e condivisioni',
        likes: 'Reazioni',
        comments: 'Commenti',
        shares: 'Condivisioni',
        title: 'Titolo',
        description: 'Descrizione'
    },
    'tiktok': {
        date: 'Data di pubblicazione del video', // Corretto
        views: 'Visualizzazioni video',      // Corretto
        likes: 'Mi piace',                   // Corretto
        comments: 'Commenti',                // Corretto
        shares: 'Condivisioni',              // Corretto
        description: 'Descrizione video'       // Nuovo campo!
    }
};

const getValueFromRecord = (record: DocumentData, key: string | undefined): string | null => {
    if (!key) return null;
    const recordKey = Object.keys(record).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return recordKey ? record[recordKey] : null;
};

const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;
    try {
        if (platform === 'youtube') {
            return parse(dateStr, 'MMM d, yyyy', new Date(), { locale: enUS });
        }
        // La data di TikTok e di Facebook/Instagram nel formato numerico viene gestita correttamente qui
        if (dateStr.includes('/')) {
             try { return parse(dateStr, 'MM/dd/yyyy HH:mm', new Date()); } catch (e) {}
             try { return parse(dateStr, 'dd/MM/yyyy HH:mm', new Date()); } catch (e) {}
        }
        // Il costruttore generico di Date è un buon fallback
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    } catch (e) {
        console.error(`Errore nel parsing della data "${dateStr}" per la piattaforma ${platform}`, e);
        return null;
    }
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
    if (!mapper) {
        console.warn(`Nessuna mappatura trovata per la piattaforma '${platformName}'`);
        return { updated: 0, created: 0 };
    }

    let updatedPostsCount = 0;
    let createdPostsCount = 0;
    let relevantDbPosts = existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName);
    const writePromises: Promise<void>[] = [];

    for (const record of parsedData) {
        const csvDate = parseDate(getValueFromRecord(record, mapper.date), platformName);
        if (!csvDate) continue;

        const viewsValue = getValueFromRecord(record, mapper.views) || (platformName === 'facebook' ? getValueFromRecord(record, mapper.interactions) : null);
        const likesValue = getValueFromRecord(record, mapper.likes);
        const commentsValue = getValueFromRecord(record, mapper.comments);
        if (!viewsValue && !likesValue && !commentsValue) continue; 
        
        const matchingPostIndex = relevantDbPosts.findIndex(p => p.data && isSameDay((p.data as Timestamp).toDate(), csvDate));

        const performanceData: { [key: string]: any } = { lastUpdated: serverTimestamp() };
        if (viewsValue) performanceData.views = parseInt(String(viewsValue).replace(/,/g, ''), 10) || 0;
        if (likesValue) performanceData.likes = parseInt(String(likesValue).replace(/,/g, ''), 10) || 0;
        if (commentsValue) performanceData.comments = parseInt(String(commentsValue).replace(/,/g, ''), 10) || 0;
        if (mapper.shares && getValueFromRecord(record, mapper.shares)) performanceData.shares = parseInt(String(getValueFromRecord(record, mapper.shares)).replace(/,/g, ''), 10) || 0;
        
        const postTitle = getValueFromRecord(record, mapper.title);
        const postDescription = getValueFromRecord(record, mapper.description);
        const postType = getValueFromRecord(record, mapper.postType);

        if (matchingPostIndex !== -1) {
            const matchingPost = relevantDbPosts.splice(matchingPostIndex, 1)[0];
            updatedPostsCount++;
            
            const metricsDocRef = doc(db, 'performanceMetrics', matchingPost.id);
            writePromises.push(setDoc(metricsDocRef, performanceData, { merge: true }));
            
            const postDocRef = doc(db, 'contenuti', matchingPost.id);
            const postUpdateData: { [key: string]: any } = {};
            if (postTitle != null) postUpdateData.titolo = postTitle;
            if (postDescription != null) {
                postUpdateData.descrizione = postDescription;
                postUpdateData.testo = postDescription;
            }
            if (postType != null) postUpdateData.tipoContenuto = postType;
            
            if (Object.keys(postUpdateData).length > 0) {
                writePromises.push(updateDoc(postDocRef, postUpdateData));
            }

        } else if (importStrategy === 'create_new') {
            createdPostsCount++;
            
            const newPostData = {
                userId,
                titolo: postTitle || `Contenuto importato (${platformName}) - ${format(csvDate, 'dd/MM/yyyy')}`,
                data: Timestamp.fromDate(csvDate),
                piattaforma: platform,
                statoProdotto: true,
                statoPubblicato: true,
                descrizione: postDescription || "Testo non disponibile nel file.",
                testo: postDescription || "Testo non disponibile nel file.",
                note: "Creato da importazione analytics.",
                projectId: null,
                tipoContenuto: postType || 'Importato'
            };
            
            const newPostRef = await addDoc(collection(db, 'contenuti'), newPostData);
            const newMetricsDocRef = doc(db, 'performanceMetrics', newPostRef.id);
            writePromises.push(setDoc(newMetricsDocRef, performanceData));
        }
    }

    await Promise.all(writePromises);
    return { updated: updatedPostsCount, created: createdPostsCount };
};