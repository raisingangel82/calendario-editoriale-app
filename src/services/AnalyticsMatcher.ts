import { db } from '../firebase';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, format, parse, startOfDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
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

    if (platform === 'tiktok' && /^\d{1,2} \w+$/.test(dateStr)) {
        try {
            const parsed = parse(dateStr, 'd MMMM', new Date(), { locale: it });
            if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {}
    }
    
    const formatsToTry = [
        'yyyy-MM-dd',
        'dd/MM/yyyy',
        'MM/dd/yyyy',
        'MMM d, yyyy',
        'yyyy/MM/dd',
        'MM-dd-yyyy',
        'dd-MM-yyyy'
    ];

    for (const format of formatsToTry) {
        try {
            const parsed = parse(dateStr, format, new Date(), { locale: enUS });
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        } catch (e) {}
    }

    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    } catch (e) {
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
    if (!mapper) return { updated: 0, created: 0 };

    let updatedPostsCount = 0;
    let createdPostsCount = 0;
    const relevantDbPosts = existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName);
    const writePromises: Promise<void>[] = [];

    console.log(`\n--- 🚀 INIZIO PROCESSO PER LA PIATTAFORMA: ${platformName.toUpperCase()} ---`);
    console.log(`Trovati ${parsedData.length} record nel CSV e ${relevantDbPosts.length} post esistenti nel DB.`);

    for (const [index, record] of parsedData.entries()) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);

        console.log(`\n[${platformName.toUpperCase()} - Riga CSV ${index + 1}]`);
        console.log(`  - Data Grezza: "${rawDate}"`);
        console.log(`  - Data Parsata: ${csvDate ? csvDate.toISOString() : "❌ PARSING FALLITO"}`);

        if (!csvDate) {
            console.log("  - Esito: Riga scartata per data non valida.");
            continue;
        }
        
        const matchingPostIndex = relevantDbPosts.findIndex(p => {
            const firestoreDate = p.data ? (p.data as Timestamp).toDate() : null;
            return firestoreDate && isSameDay(startOfDay(firestoreDate), startOfDay(csvDate));
        });

        if (matchingPostIndex !== -1) {
            const matchedPost = relevantDbPosts[matchingPostIndex];
            console.log(`  - Esito: ✅ MATCH TROVATO con post del DB del ${matchedPost.data.toDate().toISOString()}`);
            updatedPostsCount++;

            // --- LOGICA DI AGGIORNAMENTO ATTIVATA ---
            const postRef = doc(db, 'contenuti', matchedPost.id); // Usa il nome corretto della collezione
            
            const updateData: { [key: string]: any } = {};
            
            const views = getValueFromRecord(record, mapper.views);
            if(views) updateData.views = Number(views.replace(/,/g, '')); // Converte in numero e rimuove virgole

            const likes = getValueFromRecord(record, mapper.likes);
            if(likes) updateData.likes = Number(likes.replace(/,/g, ''));

            const comments = getValueFromRecord(record, mapper.comments);
            if(comments) updateData.comments = Number(comments.replace(/,/g, ''));
            
            const shares = getValueFromRecord(record, mapper.shares);
            if(shares) updateData.shares = Number(shares.replace(/,/g, ''));

            if (Object.keys(updateData).length > 0) {
                 writePromises.push(updateDoc(postRef, updateData));
                 console.log('  - Azione: Preparato aggiornamento per:', updateData);
            } else {
                 console.log('  - Azione: Nessun dato valido da aggiornare trovato nel CSV.');
            }

        } else if (importStrategy === 'create_new') {
            console.log("  - Esito: ✍️ NESSUN MATCH. Creazione nuovo post.");
            createdPostsCount++;
            
            // Qui puoi inserire la logica per creare un nuovo documento se necessario

        } else {
            console.log("  - Esito: 😴 NESSUN MATCH. Strategia 'update_only', nessuna azione.");
        }
    }
    
    // Esegue tutte le operazioni di scrittura accumulate
    if (writePromises.length > 0) {
        console.log(`\n🔄 In attesa di completare ${writePromises.length} operazioni di scrittura sul database...`);
        await Promise.all(writePromises);
        console.log('✅ Operazioni completate.');
    } else {
        console.log('\nNessuna operazione di scrittura da eseguire.');
    }
    
    console.log(`\n--- ✨ ANALISI COMPLETATA PER ${platformName.toUpperCase()}. Match aggiornati: ${updatedPostsCount}, Nuovi post creati: ${createdPostsCount} ---`);
    return { updated: updatedPostsCount, created: createdPostsCount };
};