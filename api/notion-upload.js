const formidable = require('formidable');
const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Ajouter les en-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new formidable.IncomingForm({ 
        keepExtensions: true,
        multiples: false // Important: désactive les fichiers multiples
      });
      
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // Vérifier les variables d'environnement
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      throw new Error('Configuration serveur manquante');
    }

    const title = fields.title;
    const imageFile = files.image;

    if (!title || !imageFile) {
      throw new Error('Titre ou image manquant');
    }

    // Upload vers Uguu
    const uploadForm = new FormData();
    uploadForm.append('file', fs.createReadStream(imageFile.filepath), {
      filename: imageFile.originalFilename,
      contentType: imageFile.mimetype
    });

    const uploadRes = await fetch('https://uguu.se/upload.php', {
      method: 'POST',
      body: uploadForm,
      headers: uploadForm.getHeaders()
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Erreur Uguu: ${errorText}`);
    }

    const uploadData = await uploadRes.json();
    const imageUrl = uploadData.files[0]?.url;

    if (!imageUrl) {
      throw new Error('URL image manquante dans la réponse Uguu');
    }

    // Envoi à Notion
    const notionPayload = {
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        "Nom": {
          title: [{ text: { content: title } }]
        },
        "Fichier": {
          files: [
            {
              name: imageFile.originalFilename,
              external: { url: imageUrl }
            }
          ]
        }
      }
    };

    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notionPayload)
    });

    if (!notionRes.ok) {
      const error = await notionRes.text();
      throw new Error(`Erreur Notion: ${error}`);
    }

    // Nettoyage
    fs.unlink(imageFile.filepath, () => {});

    return res.status(200).json({ 
      success: true,
      message: "Envoi réussi à Notion",
      imageUrl
    });
    
  } catch (error) {
    // Journalisation de l'erreur complète
    console.error('ERREUR COMPLÈTE:', error);
    
    return res.status(500).json({ 
      error: error.message || 'Erreur serveur',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};