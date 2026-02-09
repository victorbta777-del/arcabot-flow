import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar armazenamento de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        // Aceitar PDFs, imagens, documentos
        const allowedTypes = /pdf|jpg|jpeg|png|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'));
        }
    }
});

export const createUploadRoutes = () => {
    const router = express.Router();

    // Upload de arquivo
    router.post('/file', upload.single('file'), (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado' });
            }

            // Retornar URL do arquivo
            const fileUrl = `/uploads/${req.file.filename}`;

            res.json({
                url: fileUrl,
                filename: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({ error: 'Falha ao fazer upload do arquivo' });
        }
    });

    return router;
};
