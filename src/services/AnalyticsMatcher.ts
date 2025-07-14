import { db } from '../firebase';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, format, parse, startOfDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale'; // Aggiunto 'it' per il parsing di TikTok
import type { Post } from '../types';

// Mappatura definitiva (invariata)
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

/**
 * Funzione di parsing delle date potenziata e più robusta.
 * Tenta di interpretare la data usando una lista di formati comuni.
 */
const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;

    // Gestione speciale per TikTok "giorno mese" in italiano
    if (platform === 'tiktok' && /^\d{1,2} \w+$/.test(dateStr)) {
        try {
            const parsed = parse(dateStr, 'd MMMM', new Date(), { locale: it });
            if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {
            // Ignora e continua con gli altri formati
        }
    }
    
    // Lista di formati da provare in sequenza
    const formatsToTry = [
        'yyyy-MM-dd',      // Formato ISO, il più affidabile
        'dd/MM/yyyy',      // Formato europeo comune
        'MM/dd/yyyy',      // Formato americano comune
        'MMM d, yyyy',     // Formato YouTube (es. Jul 14, 2025)
        'yyyy/MM/dd',      // Altra variante comune
        'MM-dd-yyyy',
        'dd-MM-yyyy'
    ];

    for (const format of formatsToTry) {
        try {
            const parsed = parse(dateStr, format, new Date(), { locale: enUS });
            if (!isNaN(parsed.getTime())) {
                return parsed; // Ritorna la prima corrispondenza valida
            }
        } catch (e) {
            // Continua al prossimo formato
        }
    }

    // Fallback finale se nessun formato ha funzionato
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    } catch (e) {
        return null;
    }

    return null; // Ritorna null se tutti i tentativi falliscono
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

        // --- BLOCCO DI DEBUG UNIVERSALE ---
        console.log(`\n[${platformName.toUpperCase()} - Riga CSV ${index + 1}]`);
        console.log(`  - Data Grezza: "${rawDate}"`);
        console.log(`  - Data Parsata: ${csvDate ? csvDate.toISOString() : "❌ PARSING FALLITO"}`);

        if (!csvDate) {
            console.log("  - Esito: Riga scartata per data non valida.");
            continue;
        }

        const viewsValue = getValueFromRecord(record, mapper.views);
        if (!viewsValue) {
            console.log("  - Esito: Riga scartata per visualizzazioni non valide.");
            continue;
        }
        
        const matchingPostIndex = relevantDbPosts.findIndex(p => {
            const firestoreDate = p.data ? (p.data as Timestamp).toDate() : null;
            return firestoreDate && isSameDay(startOfDay(firestoreDate), startOfDay(csvDate));
        });

        const performanceData = { /* ... (i tuoi dati sulle performance) ... */ };

        if (matchingPostIndex !== -1) {
            const matchedPost = relevantDbPosts[matchingPostIndex];
            console.log(`  - Esito: ✅ MATCH TROVATO con post del DB del ${matchedPost.data.toDate().toISOString()}`);
            updatedPostsCount++;
            
            // LOGICA DI AGGIORNAMENTO (DA COMPLETARE CON I TUOI DATI)
            // const postRef = doc(db, 'posts', matchedPost.id); // Assumendo che la collezione sia 'posts'
            // writePromises.push(updateDoc(postRef, { performance: performanceData }));

        } else if (importStrategy === 'create_new') {
            console.log("  - Esito: ✍️ NESSUN MATCH. Creazione nuovo post.");
            createdPostsCount++;

            // LOGICA DI CREAZIONE (DA COMPLETARE CON I TUOI DATI)
            // const newPostData = { /* ... dati del nuovo post ... */, userId: userId };
            // writePromises.push(addDoc(collection(db, 'posts'), newPostData));

        } else {
            console.log("  - Esito: 😴 NESSUN MATCH. Strategia 'update_only', nessuna azione.");
        }
    }
    
    // Esegue tutte le operazioni di scrittura (aggiornamenti e creazioni) in parallelo.
    // Assicurati di popolare l'array `writePromises` con le tue operazioni `updateDoc` o `addDoc`.
    // await Promise.all(writePromises); 
    
    console.log(`\n--- ✨ ANALISI COMPLETATA PER ${platformName.toUpperCase()}. Match teorici trovati: ${updatedPostsCount}, Nuovi post: ${createdPostsCount} ---`);
    return { updated: updatedPostsCount, created: createdPostsCount };
};