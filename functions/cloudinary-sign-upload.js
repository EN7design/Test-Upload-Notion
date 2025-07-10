// functions/cloudinary-sign-upload.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary avec vos identifiants sécurisés
// Ces variables doivent être définies dans les variables d'environnement de votre plateforme serverless (Netlify/Vercel)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    try {
        const { public_id, upload_preset } = JSON.parse(event.body);

        // Options de signature, assurez-vous qu'elles correspondent à ce que vous attendez
        const options = {
            timestamp: Math.round((new Date()).getTime() / 1000),
            upload_preset: upload_preset || 'unsigned_upload_preset_name', // Utilisez votre preset signé ici
            public_id: public_id, // Laissez Cloudinary générer un ID si non fourni
            // Ajoutez d'autres options si nécessaires (ex: folder)
        };

        // Générer la signature d'upload
        const signature = cloudinary.utils.api_sign_request(
            options,
            cloudinary.config().api_secret
        );

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signature: signature,
                timestamp: options.timestamp,
                cloudname: cloudinary.config().cloud_name,
                api_key: cloudinary.config().api_key,
                upload_preset: options.upload_preset
            })
        };

    } catch (error) {
        console.error('Erreur lors de la génération de la signature Cloudinary :', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erreur lors de la génération de la signature d\'upload.' })
        };
    }
};