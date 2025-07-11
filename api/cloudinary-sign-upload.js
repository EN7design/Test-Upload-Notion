// api/cloudinary-sign-upload.js

require('dotenv').config({ path: '../.env' }); // Charge les variables d'environnement

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// CHANGEMENT ICI : Utilisation de module.exports et (request, response) pour Vercel
module.exports = async (request, response) => {
    // Vercel gère le parsing JSON du corps si Content-Type est application/json
    const { upload_preset } = request.body; // Accès direct à request.body

    // Sécurité : S'assurer que seule la méthode POST est autorisée
    // Vercel gère automatiquement les méthodes non autorisées pour les routes API
    // Mais on peut ajouter une vérification explicite si on veut un message personnalisé
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Méthode non autorisée. Seul POST est permis.' });
    }

    try {
        const options = {
            timestamp: Math.round((new Date()).getTime() / 1000),
            upload_preset: upload_preset,
        };

        const signature = cloudinary.utils.api_sign_request(
            options,
            cloudinary.config().api_secret
        );

        // CHANGEMENT ICI : Utilisation de response.status().json() pour Vercel
        return response.status(200).json({
            signature: signature,
            timestamp: options.timestamp,
            cloudname: cloudinary.config().cloud_name,
            api_key: cloudinary.config().api_key,
            upload_preset: options.upload_preset
        });

    } catch (error) {
        console.error('Erreur lors de la génération de la signature Cloudinary :', error);
        return response.status(500).json({ error: 'Erreur interne du serveur lors de la signature d\'upload.' });
    }
};