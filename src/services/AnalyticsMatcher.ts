import { db } from '../firebase';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, format, parse, startOfDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import type { Post } from '../types';

// Mappatura (invariata)
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
    const writePromises: Promise<void>[] = [];
    const writeOperationsInfo: {id: string, data: any}[] = [];
    const updatedPostsData = new Map<string, any>();

    console.log(`\n--- 🚀 INIZIO PROCESSO PER LA PIATTAFORMA: ${platformName.toUpperCase()} ---`);

    for (const [index, record] of parsedData.entries()) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);

        if (!csvDate) continue;
        
        const matchingPostIndex = relevantDbPosts.findIndex(p => {
            const firestoreDate = p.data ? (p.data as Timestamp).toDate() : null;
            return firestoreDate && isSameDay(startOfDay(firestoreDate), startOfDay(csvDate));
        });

        if (matchingPostIndex !== -1) {
            const matchedPost = relevantDbPosts[matchingPostIndex];
            updatedPostsCount++;

            const postRef = doc(db, 'performanceMetrics', matchedPost.id);
            const updateData: { [key: string]: any } = {};
            const cleanAndConvertToNumber = (value: string | null): number | null => {
                if (!value) return null;
                const cleanedValue = value.replace(/[.,\s]/g, '');
                const numberValue = Number(cleanedValue);
                return isNaN(numberValue) ? null : numberValue;
            };

            const views = cleanAndConvertToNumber(getValueFromRecord(record, mapper.views));
            if (views !== null) updateData.views = views;
            const likes = cleanAndConvertToNumber(getValueFromRecord(record, mapper.likes));
            if (likes !== null) updateData.likes = likes;
            const comments = cleanAndConvertToNumber(getValueFromRecord(record, mapper.comments));
            if (comments !== null) updateData.comments = comments;
            const shares = cleanAndConvertToNumber(getValueFromRecord(record, mapper.shares));
            if (shares !== null) updateData.shares = shares;

            if (Object.keys(updateData).length > 0) {
                 writePromises.push(updateDoc(postRef, updateData));
                 writeOperationsInfo.push({ id: matchedPost.id, data: updateData });
                 updatedPostsData.set(matchedPost.id, updateData);
            }
        }
    }
    
    if (writePromises.length > 0) {
        await Promise.allSettled(writePromises);
    }
    
    console.log(`\n--- ✨ ANALISI COMPLETATA ---`);
    return { updated: updatedPostsCount, created: createdPostsCount, updatedPostsData };
};