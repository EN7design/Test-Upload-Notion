// public/js/storageApi.js (ou intégré dans dashboard.js)

async function uploadImageToCloudinary(file) {
    const uploadStatusDiv = document.getElementById('uploadStatus');
    const uploadedImagePreview = document.getElementById('uploadedImagePreview');
    uploadStatusDiv.textContent = 'Envoi de l\'image en cours...';
    uploadedImagePreview.style.display = 'none';

    // 1. Vérifiez la taille du fichier (5MB max)
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        uploadStatusDiv.textContent = `Erreur : L'image dépasse la taille maximale de ${MAX_SIZE_MB} Mo.`;
        return null;
    }

    try {
        // 2. Demander une signature d'upload à votre fonction serverless
        const signatureResponse = await fetch('/.netlify/functions/cloudinary-sign-upload', { // Adaptez l'URL si Vercel etc.
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upload_preset: 'menunayo_signed_upload' }) // Utilisez le nom de votre preset signé
        });

        if (!signatureResponse.ok) {
            const errorData = await signatureResponse.json();
            throw new Error(errorData.error || 'Erreur lors de la récupération de la signature.');
        }
        const signatureData = await signatureResponse.json();

        // 3. Préparer les données pour l'upload direct vers Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', signatureData.api_key);
        formData.append('timestamp', signatureData.timestamp);
        formData.append('signature', signatureData.signature);
        formData.append('upload_preset', signatureData.upload_preset); // Important pour le preset signé

        // 4. Envoyer l'image directement à Cloudinary
        const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudname}/image/upload`;
        const uploadResponse = await fetch(cloudinaryUploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error.message || 'Échec de l\'upload vers Cloudinary.');
        }

        const imageData = await uploadResponse.json();
        const imageUrl = imageData.secure_url; // L'URL HTTPS de l'image uploadée

        uploadStatusDiv.textContent = 'Image uploadée avec succès !';
        uploadedImagePreview.src = imageUrl;
        uploadedImagePreview.style.display = 'block';

        console.log('Image Cloudinary URL:', imageUrl);
        return imageUrl; // Retourne l'URL pour la stocker dans Notion

    } catch (error) {
        console.error('Erreur d\'upload d\'image :', error);
        uploadStatusDiv.textContent = `Échec de l'upload : ${error.message}`;
        return null;
    }
}

// Gestionnaire d'événement pour le formulaire
document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadImageForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('imageUpload');
            const file = fileInput.files[0];

            if (file) {
                const imageUrl = await uploadImageToCloudinary(file);
                if (imageUrl) {
                    // Ici, vous prendriez l'imageUrl et l'enverriez à votre fonction serverless Notion
                    // pour la stocker dans votre BDD Notion pour le plat ou l'établissement concerné.
                    console.log("URL de l'image prête à être stockée dans Notion :", imageUrl);
                    // Exemple (à adapter à votre logique NotionAPI) :
                    // await notionApi.updateDishImage(dishId, imageUrl);
                }
            } else {
                document.getElementById('uploadStatus').textContent = 'Veuillez sélectionner un fichier.';
            }
        });
    }
});