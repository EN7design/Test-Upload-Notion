// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const itemUploadForm = document.getElementById('itemUploadForm');
    const itemTitleInput = document.getElementById('itemTitle');
    const imageUploadInput = document.getElementById('imageUpload');
    const statusMessage = document.getElementById('statusMessage');
    const imagePreview = document.getElementById('imagePreview');

    // Prévisualisation de l'image sélectionnée
    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block'; // Afficher l'aperçu
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = '';
            imagePreview.style.display = 'none'; // Cacher l'aperçu si pas de fichier
        }
    });

    // Gestion de la soumission du formulaire
    itemUploadForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Empêche le rechargement de la page

        const title = itemTitleInput.value.trim();
        const imageFile = imageUploadInput.files[0];

        // Validation de base
        if (!title) {
            statusMessage.textContent = 'Veuillez entrer un titre.';
            statusMessage.style.color = 'red';
            return;
        }

        if (!imageFile) {
            statusMessage.textContent = 'Veuillez sélectionner une image.';
            statusMessage.style.color = 'red';
            return;
        }

        // Vérification de la taille de l'image (5 Mo maximum)
        const MAX_SIZE_MB = 5;
        if (imageFile.size > MAX_SIZE_MB * 1024 * 1024) {
            statusMessage.textContent = `Erreur : L'image dépasse la taille maximale de ${MAX_SIZE_MB} Mo.`;
            statusMessage.style.color = 'red';
            return;
        }

        statusMessage.textContent = 'Traitement en cours... Veuillez patienter.';
        statusMessage.style.color = 'orange';

        let uploadedImageUrl = null;

        try {
            // *** VRAI APPEL : Récupérer la signature d'upload depuis votre fonction serverless ***
            // Remarque : L'URL est relative car elle pointe vers la fonction Netlify/Vercel
            const signatureResponse = await fetch('/api/cloudinary-sign-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // On envoie le nom du preset d'upload que nous avons créé sur Cloudinary
                // Assurez-vous que ce nom correspond à votre preset signé !
                body: JSON.stringify({ upload_preset: 'test-uploading' }) // Utilisez le nom exact de votre preset Cloudinary
            });

            if (!signatureResponse.ok) {
                const errorData = await signatureResponse.json();
                throw new Error(errorData.error || 'Erreur lors de la récupération de la signature Cloudinary.');
            }
            const signatureData = await signatureResponse.json();

            // *** VRAI APPEL : Envoyer l'image directement à Cloudinary avec la signature ***
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('api_key', signatureData.api_key);
            formData.append('timestamp', signatureData.timestamp);
            formData.append('signature', signatureData.signature);
            formData.append('upload_preset', signatureData.upload_preset); // Utilisation du preset signé

            const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudname}/image/upload`;
            const uploadResponse = await fetch(cloudinaryUploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error.message || 'Échec de l\'upload de l\'image vers Cloudinary.');
            }

            const imageData = await uploadResponse.json();
            uploadedImageUrl = imageData.secure_url; // L'URL HTTPS de l'image uploadée

            console.log('Image Cloudinary URL:', uploadedImageUrl);
            imagePreview.src = uploadedImageUrl; // Mettre à jour l'aperçu avec l'URL Cloudinary
            imagePreview.style.display = 'block';

            // *** VRAI APPEL : Envoyer le titre et l'URL de l'image à Notion via votre fonction serverless ***
            const notionSaveResponse = await fetch('/api/notion-save-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, imageUrl: uploadedImageUrl })
            });

            if (!notionSaveResponse.ok) {
                const errorData = await notionSaveResponse.json();
                throw new Error(errorData.error || 'Erreur lors de l\'enregistrement dans Notion.');
            }

            statusMessage.textContent = 'Élément et image enregistrés avec succès dans Notion !';
            statusMessage.style.color = 'green';
            itemUploadForm.reset(); // Réinitialise le formulaire
            // imagePreview.style.display = 'none'; // Garde l'aperçu de l'image uploadée si tu veux

        } catch (error) {
            console.error("Erreur complète :", error);
            statusMessage.textContent = `Échec : ${error.message}`;
            statusMessage.style.color = 'red';
            imagePreview.src = '';
            imagePreview.style.display = 'none';
        }
    });
});