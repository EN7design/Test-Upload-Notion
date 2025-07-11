document.addEventListener('DOMContentLoaded', () => {
    // --- Mettre à jour les IDs pour correspondre à index.html ---
    const uploadForm = document.getElementById('itemUploadForm'); // ID corrigé: 'itemUploadForm'
    const imageInput = document.getElementById('imageUpload');   // ID corrigé: 'imageUpload'
    const titleInput = document.getElementById('itemTitle');     // ID corrigé: 'itemTitle'
    const uploadButton = uploadForm.querySelector('button[type="submit"]'); // Sélectionne le bouton à l'intérieur du formulaire
    const statusMessage = document.getElementById('statusMessage');

    // Vérification que tous les éléments sont trouvés (utile pour le débogage)
    if (!uploadForm || !imageInput || !titleInput || !uploadButton || !statusMessage) {
        console.error("Erreur: Un ou plusieurs éléments HTML n'ont pas été trouvés.");
        // Vous pouvez afficher un message d'erreur plus visible ici si vous voulez
        statusMessage.textContent = "Erreur interne : les éléments de la page ne sont pas chargés correctement.";
        statusMessage.style.color = 'red';
        return; // Arrête l'exécution si les éléments ne sont pas là
    }


    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Empêche l'envoi du formulaire par défaut

        const file = imageInput.files[0];
        const title = titleInput.value.trim();

        if (!file) {
            statusMessage.textContent = 'Veuillez sélectionner une image.';
            statusMessage.style.color = 'red';
            return;
        }

        if (!title) {
            statusMessage.textContent = 'Veuillez entrer un titre.';
            statusMessage.style.color = 'red';
            return;
        }

        uploadButton.disabled = true;
        statusMessage.textContent = 'Téléchargement et enregistrement en cours...';
        statusMessage.style.color = 'orange';

        try {
            // Étape 1 : Récupérer la signature d'upload depuis votre fonction serverless
            const signatureResponse = await fetch('/api/cloudinary-sign-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upload_preset: 'test-uploading' }) // Assurez-vous que c'est le bon preset Cloudinary
            });

            if (!signatureResponse.ok) {
                const errorData = await signatureResponse.json();
                throw new Error(`Erreur lors de la récupération de la signature (${signatureResponse.status}): ${errorData.error || signatureResponse.statusText}`);
            }

            const { signature, timestamp, cloudname, api_key, upload_preset } = await signatureResponse.json();

            // Étape 2 : Uploader l'image sur Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', api_key);
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            formData.append('upload_preset', upload_preset); // Ajout du preset pour une vérification de cohérence

            const cloudinaryUploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudname}/image/upload`, {
                method: 'POST',
                body: formData
            });

            if (!cloudinaryUploadResponse.ok) {
                const errorData = await cloudinaryUploadResponse.json();
                throw new Error(`Erreur lors de l'upload Cloudinary (${cloudinaryUploadResponse.status}): ${errorData.error?.message || cloudinaryUploadResponse.statusText}`);
            }

            const cloudinaryResult = await cloudinaryUploadResponse.json();
            const uploadedImageUrl = cloudinaryResult.secure_url;
            console.log('Image Cloudinary URL:', uploadedImageUrl);

            // Étape 3 : Envoyer le titre et l'URL de l'image à Firebase via votre fonction serverless
            const firebaseSaveResponse = await fetch('/api/firebase-save-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, imageUrl: uploadedImageUrl })
            });

            if (firebaseSaveResponse.ok) {
                const firebaseResult = await firebaseSaveResponse.json();
                console.log('Enregistrement Firebase réussi:', firebaseResult);
                statusMessage.textContent = 'Succès : Image uploadée et enregistrée dans Firebase !';
                statusMessage.style.color = 'green';
            } else {
                const errorData = await firebaseSaveResponse.json();
                throw new Error(`Erreur Firebase (${firebaseSaveResponse.status}): ${errorData.error}`);
            }

        } catch (error) {
            console.error('Erreur complète :', error);
            statusMessage.textContent = `Échec : ${error.message}`;
            statusMessage.style.color = 'red';
        } finally {
            uploadButton.disabled = false;
        }
    });
});