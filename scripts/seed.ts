import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3EiyPqxAJRo6A8xnva0iB3R2XGZnKPWI",
  authDomain: "calendario-editoriale-so-bc85b.firebaseapp.com",
  projectId: "calendario-editoriale-so-bc85b",
  storageBucket: "calendario-editoriale-so-bc85b.firebasestorage.app",
  messagingSenderId: "163208289900",
  appId: "1:163208289900:web:ac529fa7abd47cb64b4249",
  measurementId: "G-386XG3W2CE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USER_ID = "ZwXJx9FrNmTkuM662paxRrpbIpg2";

const contenutiIniziali = [
  // --- Libro 1: Riflessi di Desiderio ---
  { libro: "Riflessi di Desiderio", piattaforma: "X", tipoContenuto: "Testo Breve con Immagine", descrizione: "Cosa succede quando la tua vita 'perfetta' non ti basta più? Sofia ha scelto di guardare oltre, attraverso l'obiettivo del suo desiderio. #RiflessiDiDesiderio, dove ogni scatto rivela una verità. Scopri il suo inizio! #RomanzoRosa #Fotografia #DesiderioFemminile" },
  { libro: "Riflessi di Desiderio", piattaforma: "X", tipoContenuto: "Domanda Aperta", descrizione: "Il desiderio è una forza nascosta o manifesta? Sofia lo esplora. E tu, cosa credi che il tuo desiderio ti stia sussurrando? Rispondi e condividi la tua prospettiva! #Desiderio #Autenticità #Lettura" },
  { libro: "Riflessi di Desiderio", piattaforma: "Threads", tipoContenuto: "Riflessione Personale", descrizione: "Ho iniziato a scrivere 'Riflessi di Desiderio' esplorando le vite di donne che, come Sofia, si confrontano con le aspettative sociali. Ma presto, la sua storia è diventata lo specchio della mia. Avete mai avuto un progetto che vi ha cambiato mentre lo creavate? #ScritturaCreativa #Autore #RomanzoRosa" },
  { libro: "Riflessi di Desiderio", piattaforma: "Threads", tipoContenuto: "Aneddoto/Dietro le Quinte", descrizione: "Nel primo capitolo di #RiflessiDiDesiderio, Sofia intervista Claudia, e un semplice scambio sulla 'verità che si mostra' capovolge tutto. Questo momento è stato ispirato da conversazioni reali con artisti sul potere di 'mostrare, non raccontare'. Qual è il dettaglio più piccolo ma più significativo che avete mai notato in una conversazione?" },
  { libro: "Riflessi di Desiderio", piattaforma: "Instagram", tipoContenuto: "Reel - Hook visivo forte", descrizione: "Sofia Ricci aveva tutto: un matrimonio, una carriera. Ma un progetto sul desiderio femminile le ha aperto gli occhi su una verità che non osava vedere. Un viaggio profondo nella scoperta di sé, tra convenzioni e passioni inaspettate. Scopri la sua storia. Link in bio! #RiflessiDiDesiderio #RomanzoRosa #BookstagramItalia #Autenticità" },
  { libro: "Riflessi di Desiderio", piattaforma: "Instagram", tipoContenuto: "Post Statico/Carousel", descrizione: "Se potessi scegliere, saresti più 'sicura' o 'autentica'? La scelta di Sofia in #RiflessiDiDesiderio è un percorso che molti temono. Qual è stata la scelta più coraggiosa che hai fatto per te stessa? Condividi nei commenti! #ScelteDiVita #RomanzoRosa #Ispirazione #Libri" },
  { libro: "Riflessi di Desiderio", piattaforma: "YouTube", tipoContenuto: "Video Tutorial/Vlog", descrizione: "Come un Progetto Fotografico ha Svelato Verità Nascoste: Il Cuore di Riflessi di Desiderio. Se questo video ti ha ispirato, immagina quanto può fare la storia di Sofia. Trovi il link a 'Riflessi di Desiderio' nella descrizione e nel primo commento! Iscriviti per non perdere altri approfondimenti." },
  { libro: "Riflessi di Desiderio", piattaforma: "YouTube", tipoContenuto: "Booktrailer", descrizione: "Riflessi di Desiderio: Un Romanzo sul Coraggio di Seguire i Tuoi Desideri Nascosti. Sei pronto a esplorare i tuoi 'Riflessi di Desiderio'? Disponibile ora. Link in descrizione!" },
  { libro: "Riflessi di Desiderio", piattaforma: "TikTok", tipoContenuto: "Trend/Hook Veloce", descrizione: "La storia di Sofia in #RiflessiDiDesiderio è un promemoria: la tua vera essenza aspetta solo di essere rivelata. Sei pronto/a a scoprirla? #BookTokItalia #RomanzoRosa #SelfDiscovery #VitaVera" },
  { libro: "Riflessi di Desiderio", piattaforma: "TikTok", tipoContenuto: "Humor/Autoironia", descrizione: "Quando la tua vita matrimoniale è una costante rappresentazione teatrale... La scena della cena con i Biraghi in #RiflessiDiDesiderio è puro gold. Chi si riconosce? #BookTok #HumorLetterario #DietroLeQuinte #RelazioniComplicate" },
  // --- Libro 2: Sotto il cielo di nessuno ---
  { libro: "Sotto il cielo di nessuno", piattaforma: "X", tipoContenuto: "Citazione d'Impatto", descrizione: "Passioni proibite, momenti rubati, sguardi che si cercano in stanze piene di gente. #SottoIlCieloDiNessuno è la storia di un desiderio che non accetta confini. Quanto saresti disposto a rischiare? #RomanzoRosa #AmoreProibito #Tradimento" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "X", tipoContenuto: "Domanda per il Pubblico", descrizione: "Il patto era chiaro: 'Non sfasceremo famiglie per questo.'. Ma cosa succede quando il desiderio è più forte di ogni promessa? Un dilemma al centro di #SottoIlCieloDiNessuno. Cosa faresti al posto loro? #DilemmaMorale #RomanzoRosa #Segreti" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "Threads", tipoContenuto: "Riflessione Autore", descrizione: "Scrivere di Marco e della sua 'gabbia di vetro e cemento' mi ha spinto a riflettere su quante vite viviamo per inerzia. #SottoIlCieloDiNessuno è una storia sul coraggio di demolire i propri muri, anche quando fa male. Qual è il 'comfort' che vi ha bloccato più a lungo? #Autenticità #CrescitaPersonale #RomanzoRosa" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "Threads", tipoContenuto: "Aneddoto Creativo", descrizione: "L'idea per la prima scena tra Marco e Alice in #SottoIlCieloDiNessuno è nata osservando l'interazione tra colleghi: sguardi rubati, tensioni non dette in ambienti professionali. Avete mai avuto un 'colpo di fulmine' in un luogo inaspettato?" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "Instagram", tipoContenuto: "Reel - Gancio Emotivo", descrizione: "Marco viveva una vita 'perfetta'... finché un desiderio proibito ha scosso le sue fondamenta. #SottoIlCieloDiNessuno è un viaggio nel cuore del tradimento, della colpa e della ricerca di sé. Pronto a scoprire quanto costa la libertà? Link in bio! #RomanzoRosa #ThrillerRomantico #AmoreProibito" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "Instagram", tipoContenuto: "Post Visivo - Contrasto", descrizione: "La vita è una gabbia dorata o un orizzonte infinito? Marco ha dovuto scegliere. In #SottoIlCieloDiNessuno, il coraggio di chiudere un capitolo apre la porta a un nuovo destino. Qual è il tuo prossimo grande salto? #Cambiamento #NuoviInizi #BookstagramItalia #MarcoEAlice" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "YouTube", tipoContenuto: "Analisi di Caratteri - Vlog", descrizione: "Analisi Profonda: Marco e Alice - Amore Proibito e Ricerca di Libertà in Sotto il cielo di nessuno. Vuoi capire davvero cosa spinge Marco e Alice? Trova 'Sotto il cielo di nessuno' qui: [Link]. Iscriviti per altre analisi!" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "YouTube", tipoContenuto: "Booktrailer Drammatico", descrizione: "Sotto il cielo di nessuno: Il Romanzo che Esplora i Confini del Desiderio Proibito. Il desiderio non conosce regole. Scopri la storia che ti terrà con il fiato sospeso. Disponibile ora! [Link]" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "TikTok", tipoContenuto: "Trend/Dilemma Etico", descrizione: "Quando la linea tra giusto e sbagliato si confonde per il desiderio... La storia di Marco e Alice in #SottoIlCieloDiNessuno è un'esplosione di emozioni! Fammi sapere la tua opinione nei commenti! #BookTok #AmoreProibito #Dilemma #RomanzoRosa" },
  { libro: "Sotto il cielo di nessuno", piattaforma: "TikTok", tipoContenuto: "Scene Veloci/Sound di Tendenza", descrizione: "Da una vita 'perfetta' a un nuovo inizio. Il viaggio di Marco è una scommessa sulla felicità. Sei pronto/a a rompere gli schemi? #SottoIlCieloDiNessuno #BookTok #NuovoInizio #CoraggioDiCambiare" },
  // --- Libro 3 ---
  { libro: "Libro 3", piattaforma: "X", tipoContenuto: "Dilemma Relazionale", descrizione: "E se l'amore non fosse binario? Sofia esplora il #Poliamore, ridefinendo il suo matrimonio e scoprendo connessioni che sfidano ogni regola. #RomanzoRosa #RelazioniNonConvenzionali #AmoreSenzaConfini" },
  { libro: "Libro 3", piattaforma: "X", tipoContenuto: "Frase Chiave/Hook", descrizione: "Il tango è tutto un gioco di invasioni e concessioni, di spazi che si aprono e si chiudono. Una metafora perfetta per l'amore in #Libro2. Quanto sei disposto/a a lasciarti guidare? #Tango #MetaforaDiVita #RomanzoRosa #LibertàEConnessione" },
  { libro: "Libro 3", piattaforma: "Threads", tipoContenuto: "Riflessione Personale Autore", descrizione: "Scrivere di #Libro2 e del percorso di Sofia nel #Poliamore è stata una sfida e una liberazione. L'idea di 'moltiplicare l'amore' invece di dividerlo è un concetto potente. Voi cosa ne pensate? È l'amore una risorsa limitata? #AmoreLiquido #RelazioniAutentiche #Scrittura" },
  { libro: "Libro 3", piattaforma: "Threads", tipoContenuto: "Dietro le Quinte / Aneddoto", descrizione: "Il loft di Bovisa, introdotto in #Libro2, è diventato il 'rifugio' di Sofia, Ele e Davide. Un luogo dove l'arte, il desiderio e la vita si intrecciano. Il vostro 'rifugio' ideale, com'è?" },
  { libro: "Libro 3", piattaforma: "Instagram", tipoContenuto: "Reel - Evoluzione Relazionale", descrizione: "La notte che ha cambiato tutto. In #Libro2, Sofia si addentra in territori inesplorati, ridefinendo amore, intimità e famiglia. Un viaggio audace che ti farà battere il cuore. Link in bio! #Poliamore #RomanzoRosa #Tango #AmoreAutentico" },
  { libro: "Libro 3", piattaforma: "Instagram", tipoContenuto: "Post Visivo/Carosello", descrizione: "Il tango. Il mosaico. La vita. #Libro2 è un'esplorazione di come l'amore possa moltiplicarsi. Qual è la tua metafora preferita per l'amore? #AmoreEvolutivo #BookstagramItalia #FamigliaNonConvenzionale" },
  { libro: "Libro 3", piattaforma: "YouTube", tipoContenuto: "Vlog / Intervista Autore", descrizione: "Poliamore e Amore Autentico: Esplorare i Confini delle Relazioni in Libro 2. Sei curioso di sapere come Sofia e la sua famiglia hanno trovato il loro equilibrio unico? Trovi il link a #Libro2 nella descrizione." },
  { libro: "Libro 3", piattaforma: "YouTube", tipoContenuto: "Montaggio Cinematico", descrizione: "Libro 2: Il Romanzo che Ridefinisce l'Amore e la Famiglia. Un romanzo che ridefinisce l'amore e la felicità. Scopri #Libro2. Disponibile ora! [Link]" },
  { libro: "Libro 3", piattaforma: "TikTok", tipoContenuto: "Trend con Audio di Tendenza", descrizione: "La vita poliamorosa di Sofia: tra marito, amante e ballerino di tango. Caos? No, solo tanto amore! Scopri la sua storia in #Libro2. #BookTok #Poliamore #RelazioniComplicateMaBellissime #AmoreMoltiplicato" },
  { libro: "Libro 3", piattaforma: "TikTok", tipoContenuto: "Domanda Veloce/Hook Visivo", descrizione: "Sofia ha trovato il coraggio di esplorare i suoi desideri più profondi in #Libro2. Sei pronto/a a fare il primo passo verso la tua autenticità? #BookTok #SelfLove #AmoreEDesiderio #LettureConsigliate" },
  // --- Libro 4: Il mosaico completo (il ballo della vita) ---
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "X", tipoContenuto: "Sintesi e Realizzazione", descrizione: "Non più frammentata, ma completa. Sofia ha trovato la sua autenticità in un mosaico d'amore che sfida ogni confine. #MosaicoCompleto: il finale che ti meriti. #RomanzoRosa #FinaliFelici #Autenticità" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "X", tipoContenuto: "Domanda per il Futuro", descrizione: "Dieci anni di amore, crescita e scelte coraggiose. La vita di Sofia è la dimostrazione che puoi essere tutto ciò che desideri. Qual è il tuo prossimo sogno audace? #BalloDellaVita #SogniGrandiosi #Libertà #AmoreSenzaConfini" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "Threads", tipoContenuto: "Riflessione Autore - L'Eredità", descrizione: "Scrivere #MosaicoCompleto è stato come chiudere un cerchio. La mia speranza era mostrare che 'la famiglia non è definita da strutture rigide ma dai legami che si creano'. Qual è l'eredità più importante che sperate di lasciare?" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "Threads", tipoContenuto: "Aneddoto - Accettazione Sociale", descrizione: "In #MosaicoCompleto, assistiamo alla festa di compleanno di Livia, dove la sua famiglia poliamorosa è accettata con naturalezza. Avete mai sperimentato un momento di accettazione inaspettata?" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "Instagram", tipoContenuto: "Reel - Il 'Ballo della Vita'", descrizione: "La storia di Sofia giunge al suo culmine in #MosaicoCompleto. Una vita di amore, coraggio e autenticità, dove ogni pezzo trova il suo posto. Pronto a ispirarti? Link in bio! #RomanzoRosa #FamigliaSenzaConfini #Completezza #LibertàDiEssere" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "Instagram", tipoContenuto: "Post Visivo/Carosello", descrizione: "In #MosaicoCompleto, l'eredità più grande è la libertà. I figli di Sofia crescono sapendo che 'possono essere tutto ciò che desiderano'. Qual è il messaggio più prezioso che vuoi lasciare? #Generazioni #AmoreIncondizionato #BookstagramItalia" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "YouTube", tipoContenuto: "Documentario Breve", descrizione: "Mosaici d'Amore: La Vita Quotidiana di una Famiglia Poliamorosa in Vancouver. Se questo ti ha incuriosito, scopri tutti i dettagli nel 'Libro 4' e visita il sito del progetto 'Oltre i Confini dell'Amore'!" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "YouTube", tipoContenuto: "Video Ispirazionale", descrizione: "Il Mosaico Completo: Amore, Danza e Autenticità in una Famiglia Poliamorosa. Lasciati ispirare dalla storia di Sofia e della sua famiglia. 'Mosaico Completo' è un inno all'amore autentico." },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "TikTok", tipoContenuto: "Trend/Umorismo", descrizione: "Quando i tuoi figli spiegano la tua famiglia meglio di te! Livia, la saggia icona di #MosaicoCompleto. Condividi le domande più inaspettate che ti hanno fatto! #BookTok #FamigliaNonTradizionale #Humor" },
  { libro: "Il mosaico completo (il ballo della vita)", piattaforma: "TikTok", tipoContenuto: "Celebrazione/Montaggio Ritmico", descrizione: "La vita è un mosaico, e in #MosaicoCompleto celebriamo ogni pezzo del nostro amore! Un inno alla famiglia in tutte le sue meravigliose forme. #BookTok #PrideFamily #Polyamorous #HappyEnding" }
];

async function popolaDatabase() {
  if (!USER_ID || USER_ID === "INCOLLA_QUI_IL_TUO_ID_UTENTE_ANONIMO") {
    console.error("\nERRORE: ID Utente non valido.\n");
    return;
  }

  const contenutiCollection = collection(db, "contenuti");
  console.log(`Inizio a caricare ${contenutiIniziali.length} contenuti per l'utente ${USER_ID}...`);

  let currentDate = new Date("2025-06-30T09:00:00");
  const orari = [9, 14, 18]; // Mattina, Pomeriggio, Sera
  let orarioIndex = 0;

  for (const contenuto of contenutiIniziali) {
    // Assegna data e ora
    currentDate.setHours(orari[orarioIndex]);

    const docData = {
      ...contenuto,
      userId: USER_ID,
      data: Timestamp.fromDate(currentDate),
      statoProdotto: false,
      statoPubblicato: false,
      urlMedia: '',
    };

    await addDoc(contenutiCollection, docData);
    console.log(`  -> Aggiunto: "${contenuto.tipoContenuto}" per "${contenuto.libro}"`);

    // Avanza al prossimo slot orario/giorno
    orarioIndex++;
    if (orarioIndex >= orari.length) {
      orarioIndex = 0;
      currentDate.setDate(currentDate.getDate() + 1);
      // Salta il weekend
      if (currentDate.getDay() === 6) { // Sabato
        currentDate.setDate(currentDate.getDate() + 2);
      } else if (currentDate.getDay() === 0) { // Domenica
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  console.log("\nCaricamento completato!");
}

popolaDatabase().catch(console.error);