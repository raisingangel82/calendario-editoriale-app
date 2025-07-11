// AnalyticsMatcher.ts
import { db } from '../firebase';
import { doc, updateDoc, setDoc, addDoc, collection, serverTimestamp, Timestamp, type DocumentData } from 'firebase/firestore';
import { isSameDay, format, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { Post } from '../types';

// Questo oggetto definisce come i nomi delle colonne nel tuo file CSV
// corrispondono ai dati che vogliamo estrarre per ogni piattaforma.
const platformCsvMappers: { [key: string]: { [key: string]: string } } = {
    'youtube': {
        date: 'Ora pubblicazione video',
        views: 'Visualizzazioni',
        title: 'Titolo video',
        description: 'Titolo video' // Per YouTube, usiamo il titolo come testo principale
    },
    'instagram': {
        date: 'Orario di pubblicazione',
        views: 'Copertura',
        likes: 'Mi piace',
        comments: 'Commenti',
        description: 'Didascalia',
        postType: 'Tipo di post'
    },
    'facebook': {
        id: 'ID del post', // <--- QUESTA È LA MODIFICA CHIAVE QUI: AGGIUNTO L'ID PER FACEBOOK
        date: 'Orario di pubblicazione',
        views: 'Copertura',
        interactions: 'Reazioni, commenti e condivisioni',
        likes: 'Reazioni',
        comments: 'Commenti',
        shares: 'Condivisioni',
        title: 'Titolo',
        description: 'Descrizione' // Questa è la colonna con il testo principale del post Facebook
    },
    'tiktok': {
        date: 'Date',
        views: 'Video Views',
        likes: 'Likes',
        comments: 'Comments'
        // TikTok non ha campi di testo/titolo esportati in questo mapper
    }
};

// Funzione per ottenere il valore da un record CSV in modo robusto, ignorando maiuscole/minuscole.
const getValueFromRecord = (record: DocumentData, key: string | undefined): string | null => {
    if (!key) return null;
    const recordKey = Object.keys(record).find(k => k.trim().toLowerCase() === key.toLowerCase());
    return recordKey ? record[recordKey] : null;
};

// Funzione per convertire una stringa di data dal CSV in un oggetto Date.
const parseDate = (dateStr: string | null, platform: string): Date | null => {
    if (!dateStr) return null;
    try {
        if (platform === 'youtube') {
            return parse(dateStr, 'MMM d, yyyy', new Date(), { locale: enUS });
        }
        if (platform === 'tiktok') {
            const monthMap: { [key: string]: number } = { 'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3, 'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7, 'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11 };
            const parts = dateStr.split(' ');
            const day = parseInt(parts[0]);
            const month = monthMap[parts[1]?.toLowerCase()];
            if (!isNaN(day) && month !== undefined) return new Date(new Date().getFullYear(), month, day);
        }
        // Per Facebook e Instagram, prova entrambi i formati possibili (MM/dd/yyyy HH:mm o dd/MM/yyyy HH:mm)
        if (platform === 'facebook' || platform === 'instagram') {
            if (dateStr.includes('/')) {
                 try { return parse(dateStr, 'MM/dd/yyyy HH:mm', new Date()); } catch (e) {}
                 try { return parse(dateStr, 'dd/MM/yyyy HH:mm', new Date()); } catch (e) {}
            }
        }
        // Tentativo generico come ultima risorsa
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    } catch (e) {
        console.error(`Errore nel parsing della data "${dateStr}" per la piattaforma ${platform}`, e);
        return null;
    }
    return null;
};

// Funzione principale per processare e confrontare i dati analytics con i post esistenti.
export const processAndMatchAnalytics = async (
    parsedData: DocumentData[], // I dati letti dal tuo file CSV
    platform: string,          // La piattaforma (es. 'facebook', 'youtube')
    existingPosts: Post[],     // I post già presenti nel tuo database
    userId: string,            // L'ID dell'utente proprietario dei post
    importStrategy: 'update_only' | 'create_new' // Strategia: solo aggiorna o crea anche nuovi
): Promise<{ updated: number, created: number }> => {
    const platformName = platform.toLowerCase();
    const mapper = platformCsvMappers[platformName];
    if (!mapper) {
        console.warn(`Nessuna mappatura trovata per la piattaforma '${platformName}'`);
        return { updated: 0, created: 0 };
    }

    let updatedPostsCount = 0;
    let createdPostsCount = 0;
    
    // Mappa per cercare velocemente i post di Facebook tramite il loro ID esterno.
    const relevantDbPostsMap = new Map<string, Post>(); 
    // Oggetto per cercare i post per data (come fallback o per altre piattaforme).
    const relevantDbPostsByDate: { [key: string]: Post[] } = {}; 
    
    // Prepopola le mappe con i post esistenti per la piattaforma corrente.
    existingPosts.filter(p => p.piattaforma?.toLowerCase() === platformName)
                 .forEach(p => {
                     // Se il post è di Facebook e ha già un ID esterno, lo aggiungi alla mappa per ID.
                     if (p.externalId && platformName === 'facebook') { 
                         relevantDbPostsMap.set(p.externalId, p);
                     } 
                     // Altrimenti, o in aggiunta, lo indicizzi per data.
                     if (p.data) {
                         const dateKey = format((p.data as Timestamp).toDate(), 'yyyy-MM-dd');
                         if (!relevantDbPostsByDate[dateKey]) {
                             relevantDbPostsByDate[dateKey] = [];
                         }
                         relevantDbPostsByDate[dateKey].push(p);
                     }
                 });

    const writePromises: Promise<void>[] = []; // Array per collezionare tutte le operazioni di scrittura.

    // Itera su ogni riga (record) del file CSV
    for (const record of parsedData) {
        const csvDate = parseDate(getValueFromRecord(record, mapper.date), platformName);
        if (!csvDate) continue; // Salta il record se la data non è valida.

        // Estrai i valori delle performance (visualizzazioni, mi piace, commenti, condivisioni)
        const viewsValue = getValueFromRecord(record, mapper.views) || (platformName === 'facebook' ? getValueFromRecord(record, mapper.interactions) : null);
        const likesValue = getValueFromRecord(record, mapper.likes);
        const commentsValue = getValueFromRecord(record, mapper.comments);
        if (!viewsValue && !likesValue && !commentsValue) continue; // Salta se non ci sono dati di performance.
        
        let matchingPost: Post | undefined; // Qui salveremo il post trovato nel database.
        let facebookPostId: string | null = null; // Per l'ID di Facebook.

        // --- LOGICA CHIAVE DI MATCHING ---
        // Se è un post di Facebook, prova prima a matchare con l'ID univoco.
        if (platformName === 'facebook' && mapper.id) {
            facebookPostId = getValueFromRecord(record, mapper.id); // Ottieni l'ID dal CSV.
            if (facebookPostId) {
                matchingPost = relevantDbPostsMap.get(facebookPostId); // Cerca il post nel database per ID.
            }
        }
        
        // Se non trovi un match con l'ID (o non è Facebook), prova a matchare per data.
        if (!matchingPost) {
            const dateKey = format(csvDate, 'yyyy-MM-dd');
            const postsOnSameDay = relevantDbPostsByDate[dateKey] || [];
            
            // Trova il primo post con la stessa data che non è ancora stato "preso" in questa esecuzione.
            const initialMatch = postsOnSameDay.find(p => isSameDay((p.data as Timestamp).toDate(), csvDate));
            if (initialMatch) {
                matchingPost = initialMatch;
                // Rimuovi il post trovato dalla lista temporanea per evitare che venga matchato di nuovo.
                relevantDbPostsByDate[dateKey] = relevantDbPostsByDate[dateKey].filter(p => p.id !== matchingPost?.id);
            }
        }
        // --- FINE LOGICA DI MATCHING ---

        // Prepara i dati di performance da salvare.
        const performanceData: { [key: string]: any } = { lastUpdated: serverTimestamp() };
        if (viewsValue) performanceData.views = parseInt(String(viewsValue).replace(/,/g, ''), 10) || 0;
        if (likesValue) performanceData.likes = parseInt(String(likesValue).replace(/,/g, ''), 10) || 0;
        if (commentsValue) performanceData.comments = parseInt(String(commentsValue).replace(/,/g, ''), 10) || 0;
        if (mapper.shares && getValueFromRecord(record, mapper.shares)) performanceData.shares = parseInt(String(getValueFromRecord(record, mapper.shares)).replace(/,/g, ''), 10) || 0;
        
        const postTitle = getValueFromRecord(record, mapper.title);
        const postDescription = getValueFromRecord(record, mapper.description);
        const postType = getValueFromRecord(record, mapper.postType);

        if (matchingPost) { // Se è stato trovato un post esistente nel database:
            updatedPostsCount++; // Incrementa il contatore degli aggiornati.
            
            const metricsDocRef = doc(db, 'performanceMetrics', matchingPost.id);
            // Aggiorna le metriche di performance.
            writePromises.push(setDoc(metricsDocRef, performanceData, { merge: true }));
            
            const postDocRef = doc(db, 'contenuti', matchingPost.id);
            const postUpdateData: { [key: string]: any } = {};
            
            // Per Facebook, usa la 'Descrizione' del CSV come 'Titolo' del post nel database.
            if (platformName === 'facebook' && postDescription != null) {
                postUpdateData.titolo = postDescription;
            } else if (postTitle != null) {
                postUpdateData.titolo = postTitle;
            }

            // Aggiorna descrizione e testo.
            if (postDescription != null) {
                postUpdateData.descrizione = postDescription;
                postUpdateData.testo = postDescription;
            }
            if (postType != null) postUpdateData.tipoContenuto = postType;
            
            // Se è un post di Facebook e non ha ancora un 'externalId' nel database, salvalo.
            if (platformName === 'facebook' && facebookPostId && !matchingPost.externalId) {
                postUpdateData.externalId = facebookPostId;
            }
            
            // Se ci sono dati da aggiornare, aggiungi l'operazione al batch.
            if (Object.keys(postUpdateData).length > 0) {
                writePromises.push(updateDoc(postDocRef, postUpdateData));
            }

        } else if (importStrategy === 'create_new') { // Se non è stato trovato un post e la strategia è "crea nuovo":
            createdPostsCount++; // Incrementa il contatore dei creati.
            
            // Prepara i dati per il nuovo post.
            const newPostData = {
                userId,
                // Per Facebook, usa la 'Descrizione' del CSV come 'Titolo' del nuovo post.
                titolo: (platformName === 'facebook' && postDescription) || postTitle || `Contenuto importato (${platformName}) - ${format(csvDate, 'dd/MM/yyyy')}`,
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
            
            // Se è un nuovo post di Facebook, salva subito l'ID esterno.
            if (platformName === 'facebook' && facebookPostId) {
                (newPostData as any).externalId = facebookPostId;
            }

            // Aggiungi il nuovo post e le sue metriche al database.
            const newPostRef = await addDoc(collection(db, 'contenuti'), newPostData);
            const newMetricsDocRef = doc(db, 'performanceMetrics', newPostRef.id);
            writePromises.push(setDoc(newMetricsDocRef, performanceData));
        }
    }

    // Esegui tutte le operazioni di scrittura in parallelo.
    await Promise.all(writePromises);
    return { updated: updatedPostsCount, created: createdPostsCount };
};