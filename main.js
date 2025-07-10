// ...le code de connexion à Notion sera ajouté ici après réception des clés/API...

document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = "Envoi en cours...";

    const title = document.getElementById('title').value;
    const imageInput = document.getElementById('image');
    if (!imageInput.files.length) {
        resultDiv.textContent = "Veuillez sélectionner une image.";
        return;
    }
    const image = imageInput.files[0];

    const formData = new FormData();
    formData.append('title', title);
    formData.append('image', image);

    try {
        const response = await fetch('/api/notion-upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            resultDiv.textContent = "Image et titre envoyés avec succès !";
        } else {
            resultDiv.textContent = data.error || "Erreur lors de l'envoi.";
        }
    } catch (err) {
        resultDiv.textContent = "Erreur réseau ou serveur.";
    }
});
