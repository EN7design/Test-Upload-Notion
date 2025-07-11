// api/notion-save-item.js

require('dotenv').config({ path: '../.env' }); // Charge les variables d'environnement

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// CHANGEMENT ICI : Utilisation de module.exports et (request, response) pour Vercel
module.exports = async (request, response) => {
    // Vercel gère le parsing JSON du corps
    const { title, imageUrl } = request.body; // Accès direct à request.body

    // Sécurité : S'assurer que seule la méthode POST est autorisée
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Méthode non autorisée. Seul POST est permis.' });
    }

    if (!databaseId) {
        return response.status(500).json({ error: 'Erreur de configuration : ID de base de données Notion manquant.' });
    }

    if (!title || !imageUrl) {
        return response.status(400).json({ error: 'Données manquantes : titre et imageUrl sont requis.' });
    }

    try {
        const notionResponse = await notion.pages.create({ // Renommé 'response' en 'notionResponse' pour éviter conflit
            parent: { database_id: databaseId },
            properties: {
                "Name": {
                    title: [
                        {
                            text: {
                                content: title
                            }
                        }
                    ]
                },
                "Lien Image": {
                    url: imageUrl
                }
            }
        });

        console.log("Nouvel élément ajouté à Notion:", notionResponse.id);

        // CHANGEMENT ICI : Utilisation de response.status().json() pour Vercel
        return response.status(200).json({ message: 'Élément enregistré avec succès dans Notion.', notionPageId: notionResponse.id });

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement dans Notion :', error);
        let errorMessage = 'Erreur interne du serveur lors de l\'enregistrement dans Notion.';
        if (error.code && error.status) {
            errorMessage = `Erreur Notion (${error.status}): ${error.message}`;
        }
        return response.status(error.status || 500).json({ error: errorMessage });
    }
};