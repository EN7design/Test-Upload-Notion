document.getElementById('uploadForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = "Envoi en cours...";
  resultDiv.className = '';

  const title = document.getElementById('title').value;
  const imageInput = document.getElementById('image');
  
  if (!imageInput.files.length) {
    resultDiv.textContent = "Veuillez sélectionner une image.";
    resultDiv.className = 'error';
    return;
  }
  
  const formData = new FormData();
  formData.append('title', title);
  formData.append('image', imageInput.files[0]);

  try {
    const response = await fetch('/api/notion-upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de l'envoi");
    }
    
    resultDiv.textContent = "Image et titre envoyés avec succès !";
    resultDiv.className = 'success';
    
    // Réinitialisation du formulaire
    document.getElementById('uploadForm').reset();
    
  } catch (err) {
    resultDiv.textContent = err.message || "Erreur réseau ou serveur";
    resultDiv.className = 'error';
  }
});