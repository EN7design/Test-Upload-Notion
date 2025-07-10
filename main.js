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
    
    // Gestion spéciale si la réponse n'est pas JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Réponse inattendue: ${text.slice(0, 100)}...`);
    }
    
    if (!response.ok) {
      throw new Error(data.error || `Erreur ${response.status}`);
    }
    
    resultDiv.innerHTML = `
      <strong>Succès!</strong><br>
      Image envoyée: <a href="${data.imageUrl}" target="_blank">${data.imageUrl}</a>
    `;
    resultDiv.className = 'success';
    document.getElementById('uploadForm').reset();
    
  } catch (err) {
    resultDiv.textContent = err.message || "Erreur inconnue";
    resultDiv.className = 'error';
    console.error('Erreur frontend:', err);
  }
});