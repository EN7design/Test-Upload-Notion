const formidable = require('formidable');
const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new formidable.IncomingForm({ keepExtensions: true });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const title = fields.title[0];
    const imageFile = files.image[0];

    if (!title || !imageFile) {
      return res.status(400).json({ error: 'Titre ou image manquant' });
    }

    // Upload image vers Uguu
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
      const error = await uploadRes.text();
      throw new Error(`Erreur Uguu: ${error}`);
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

    // Nettoyage du fichier temporaire
    fs.unlink(imageFile.filepath, () => {});

    return res.status(200).json({ success: true, imageUrl });
  } catch (error) {
    console.error('Erreur:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Erreur serveur' 
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};