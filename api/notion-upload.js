const formidable = require('formidable');
const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const form = new formidable.IncomingForm({ keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable error:", err);
      res.status(500).json({ error: 'Erreur lors du parsing du formulaire' });
      return;
    }

    const title = fields.title;
    const imageFile = files.image;

    if (!title || !imageFile) {
      res.status(400).json({ error: 'Titre ou image manquant' });
      return;
    }

    try {
      // Upload image to external host (Uguu)
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imageFile.filepath), imageFile.originalFilename);

      const uploadRes = await fetch('https://uguu.se/upload.php', {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.files[0].url;

      // Envoi à Notion
      const notionRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent: { database_id: process.env.NOTION_DATABASE_ID },
          properties: {
            "Nom": {
              "title": [
                {
                  "text": {
                    "content": title
                  }
                }
              ]
            },
            "Fichier": {
              "files": [
                {
                  "name": imageFile.originalFilename,
                  "external": { "url": imageUrl }
                }
              ]
            }
          }
        })
      });

      if (!notionRes.ok) {
        const error = await notionRes.text();
        res.status(500).json({ error: "Erreur Notion: " + error });
        return;
      }

      res.status(200).json({ success: true });
    } catch (e) {
      console.error("API error:", e);
      res.status(500).json({ error: 'Erreur lors de l\'upload ou de l\'envoi à Notion.' });
    }
  });
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
