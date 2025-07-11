// api/firebase-save-item.js

const admin = require('firebase-admin');

// Charge la clé du compte de service depuis la variable d'environnement
// Il est important de la parser car la variable d'environnement est une chaîne de caractères
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (e) {
    console.error('Erreur lors du parsing de la variable d\'environnement FIREBASE_SERVICE_ACCOUNT_KEY:', e);
    // En cas d'erreur de parsing, on peut renvoyer une erreur explicite
    module.exports = (request, response) => {
        return response.status(500).json({ error: 'Configuration du serveur Firebase invalide.' });
    };
    return; // Arrête l'exécution de la fonction
}


// Initialise Firebase Admin SDK si ce n'est pas déjà fait
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore(); // Obtient une référence à la base de données Firestore

module.exports = async (request, response) => {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Méthode non autorisée. Seul POST est permis.' });
    }

    const { title, imageUrl } = request.body;

    if (!title || !imageUrl) {
        return response.status(400).json({ error: 'Données manquantes : titre et imageUrl sont requis.' });
    }

    try {
        // Ajoute un nouveau document à la collection 'elements'
        const docRef = await db.collection('elements').add({
            title: title,
            imageUrl: imageUrl,
            timestamp: admin.firestore.FieldValue.serverTimestamp() // Ajoute un horodatage du serveur
        });

        console.log("Document ajouté avec l'ID:", docRef.id);

        return response.status(200).json({ message: 'Élément enregistré avec succès dans Firebase.', firebaseDocId: docRef.id });

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement dans Firebase :', error);
        return response.status(500).json({ error: 'Erreur interne du serveur lors de l\'enregistrement dans Firebase.' });
    }
};