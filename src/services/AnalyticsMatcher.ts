import { db } from '../firebase';
import { doc, setDoc, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, parse, startOfDay } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import type { Post } from '../types';

// Mappatura delle colonne CSV per ogni piattaforma.
// Questa sezione definisce quali colonne del file CSV corrispondono ai campi delle metriche (data, visualizzazioni, ecc.).
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': { date: 'Ora pubblicazione video', views: 'Visualizzazioni', title: 'Titolo video', description: 'Titolo video' },
    'instagram': { date: 'Orario di pubblicazione', views: 'Copertura', likes: 'Mi piace', comments: 'Commenti', description: 'Descrizione', postType: 'Tipo di post' },
    'facebook': { date: 'Orario di pubblicazione', views: 'Copertura', interactions: 'Reazioni, commenti e condivisioni', likes: 'Reazioni', comments: 'Commenti', shares: 'Condivisioni', title: 'Titolo', description: 'Descrizione' },
    'tiktok': { date: 'post time', views: 'Total views', likes: 'Total likes', comments: 'Total comments', shares: 'Total shares', description: 'Video title' }
};

/**
 * Estrae un valore da un record di dati (una riga del CSV) in modo case-insensitive.
 * @param record L'oggetto che rappresenta la riga del CSV.
 * @param key La chiave (nome della colonna) da cercare.
 * @returns Il valore trovato o null.
 */
const getValueFromRecord = (record: DocumentData, key: string | undefined): string | null => {
    if (!key) return null;
    // Cerca la chiave nel record ignorando maiuscole/minuscole e spazi bianchi extra.
    const recordKey = Object.keys(record).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return recordKey ? record[recordKey] : null;
};

/**
 * Converte una stringa di data in un oggetto Date, provando diversi formati comuni.
 * @param dateStr La stringa della data dal CSV.
 * @param platform La piattaforma di origine, per gestire casi specifici (es. TikTok).
 * @returns Un oggetto Date valido o null.
 */
const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;

    // Gestione specifica per il formato "d MMMM" di TikTok (es. "19 Luglio")
    if (platform === 'tiktok' && /^\d{1,2} \w+$/.test(dateStr)) {
        try {
            const parsed = parse(dateStr, 'd MMMM', new Date(), { locale: it });
            if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {}
    }
    
    // Array di formati di data comuni da provare in sequenza.
    const formatsToTry = [ 'yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'MMM d, yyyy', 'yyyy/MM/dd', 'MM-dd-yyyy', 'dd-MM-yyyy' ];

    for (const format of formatsToTry) {
        try {
            const parsed = parse(dateStr, format, new Date(), { locale: enUS });
            if (!isNaN(parsed.getTime())) return parsed;
        } catch (e) {}
    }

    // Tentativo finale con il costruttore generico di Date.
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    } catch (e) { return null; }

    return null;
};

/**
 * Processa i dati analitici da un file CSV, li abbina ai post esistenti e aggiorna/crea le metriche su Firestore.
 * @param parsedData Dati parsati dal file CSV.
 * @param platform La piattaforma a cui si riferiscono i dati (es. 'instagram').
 * @param existingPosts L'array di tutti i post dell'utente.
 * @param userId L'ID dell'utente corrente.
 * @param importStrategy Strategia di importazione ('update_only' o 'create_new').
 * @returns Un oggetto con il conteggio dei post aggiornati/creati e una mappa dei dati aggiornati.
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
    // Filtra i post del database per trovare solo quelli pertinenti alla piattaforma corrente.
    const relevantDbPosts = existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName);
    const writePromises: Promise<void>[] = [];
    const updatedPostsData = new Map<string, any>();

    console.log(`--- Inizio processo per la piattaforma: ${platformName.toUpperCase()} ---`);

    for (const record of parsedData) {
        const rawDate = getValueFromRecord(record, mapper.date);
        const csvDate = parseDate(rawDate, platformName);

        if (!csvDate) {
            console.warn("Riga saltata: data non valida o mancante.", record);
            continue;
        }
        
        // Trova un post nel database che corrisponda allo stesso giorno del record CSV.
        const matchingPostIndex = relevantDbPosts.findIndex(p => {
            const firestoreDate = p.data ? (p.data as Timestamp).toDate() : null;
            return firestoreDate && isSameDay(startOfDay(firestoreDate), startOfDay(csvDate));
        });

        if (matchingPostIndex !== -1) {
            const matchedPost = relevantDbPosts[matchingPostIndex];
            updatedPostsCount++;

            // Riferimento al documento delle metriche (che potrebbe non esistere).
            const postRef = doc(db, 'performanceMetrics', matchedPost.id);
            const updateData: { [key: string]: any } = {};
            
            /**
             * Pulisce una stringa numerica (rimuovendo punti, virgole, spazi) e la converte in numero.
             * @param value La stringa da pulire.
             * @returns Il valore numerico o null.
             */
            const cleanAndConvertToNumber = (value: string | null): number | null => {
                if (!value) return null;
                const cleanedValue = String(value).replace(/[.,\s]/g, '');
                const numberValue = Number(cleanedValue);
                return isNaN(numberValue) ? null : numberValue;
            };

            // Estrae e pulisce ogni metrica dal record CSV.
            const views = cleanAndConvertToNumber(getValueFromRecord(record, mapper.views));
            if (views !== null) updateData.views = views;

            const likes = cleanAndConvertToNumber(getValueFromRecord(record, mapper.likes));
            if (likes !== null) updateData.likes = likes;

            const comments = cleanAndConvertToNumber(getValueFromRecord(record, mapper.comments));
            if (comments !== null) updateData.comments = comments;

            const shares = cleanAndConvertToNumber(getValueFromRecord(record, mapper.shares));
            if (shares !== null) updateData.shares = shares;

            // Se sono stati trovati dati validi, prepara l'operazione di scrittura.
            if (Object.keys(updateData).length > 0) {
                 // --- MODIFICA CHIAVE APPLICATA ---
                 // Usa setDoc con { merge: true } invece di updateDoc.
                 // Questo crea il documento se non esiste, o lo aggiorna se esiste già.
                 // Risolve il bug per cui le metriche dei nuovi post non venivano salvate.
                 writePromises.push(setDoc(postRef, updateData, { merge: true }));
                 
                 // Salva i dati aggiornati per restituirli e permettere l'aggiornamento dello stato in App.tsx.
                 updatedPostsData.set(matchedPost.id, updateData);
            }
        }
        // Qui andrebbe la logica per 'create_new' se un post non viene trovato.
        // Al momento, questa parte non è implementata.
    }
    
    // Esegue tutte le operazioni di scrittura su Firestore in parallelo.
    if (writePromises.length > 0) {
        await Promise.allSettled(writePromises);
        console.log(`${writePromises.length} operazioni di scrittura completate.`);
    }
    
    console.log(`--- Analisi completata per ${platformName.toUpperCase()} ---`);
    return { updated: updatedPostsCount, created: createdPostsCount, updatedPostsData };
};
