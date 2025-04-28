const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const csvParser = require('csv-parser');
const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(cors());

const upload = multer({ dest: 'uploads/' });

const loadPuppeteerScript = (folder, scriptName) => {
    const scriptPath = path.join(__dirname, folder, scriptName);
    return require(scriptPath);
};

const autoDeleteOldUploads = async () => {
    const dirPath = path.join(__dirname, 'uploads/');
    try {
        const files = await fs.promises.readdir(dirPath);

        const deletePromises = files.map(async (file) => {
            const filePath = path.join(dirPath, file);
            try {
                const stats = await fs.promises.stat(filePath);
                if (stats.isFile()) {
                    await fs.promises.unlink(filePath);
                    console.log(`Deleted file: ${file}`);
                } else {
                    console.log(`Skipping non-file: ${file}`);
                }
            } catch (err) {
                console.error(`Error deleting file: ${file}`, err);
            }
        });

        await Promise.all(deletePromises);
        console.log('All old uploads deleted.');
    } catch (err) {
        console.error('Error reading uploads directory:', err);
    }
};

const removeEmptyValues = (obj) => {
    if (Array.isArray(obj)) {
        return obj
            .map((item) => removeEmptyValues(item))
            .filter((item) => item !== null && item !== undefined && item !== '' && Object.keys(item).length > 0); 
    } else if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '' && !(typeof value === 'object' && Object.keys(value).length === 0)) // Filter out empty values
            .reduce((acc, [key, value]) => {
                acc[key] = removeEmptyValues(value);
                return acc;
            }, {});
    } else {
        return obj;
    }
};

const differentializeProductData = async (type, fileData) => {
    const { jsonData } = fileData;
    let products = [];

    if (type === 'json-type' && jsonData) {
        try {
            products = JSON.parse(jsonData);
            products = removeEmptyValues(products);
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            throw new Error('Invalid JSON data');
        }
    } else if (type === 'csv-type' && fileData.file) {
        const filePath = path.join(__dirname, 'uploads', fileData.file.filename);
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => {
                    products = results;
                    resolve(products);
                })
                .on('error', (error) => {
                    console.error('Error reading CSV file:', error);
                    reject(error);
                });
        });
    }

    return products;
};

app.post('/js-server', upload.single('file'), async (req, res) => {
    const { type, runOption, cellOrigin, jsonData } = req.body;

    try {
        if (typeof cellOrigin !== 'object' || cellOrigin === null) {
            throw new Error('Invalid Cell Origin: Expected an object');
        }
        const cellOriginObj = Object.entries(cellOrigin);

        console.log(`Run Option: ${runOption}`);
        console.log(`Type: ${type}`);
        console.log(`Cell Origin:`, JSON.stringify(cellOriginObj, null, 2));

        let products = [];
        if (type === 'json-type' && jsonData) {
            const resolvedJsonData = await Promise.resolve(jsonData);
            if (typeof resolvedJsonData !== 'string') {
                throw new Error('Invalid JSON data: Expected a string');
            }

            products = await differentializeProductData(type, { jsonData: resolvedJsonData });
        } else {
            res.status(400).json({ message: 'Invalid data type or missing file/data' });
            return;
        }

        console.log('Processed Products:', products);

        const puppeteerScript = loadPuppeteerScript('automation', 'DSF_product_edit.js');
        await puppeteerScript(products);

        res.json({ message: 'Automation script executed successfully', products });
        await autoDeleteOldUploads();
    } catch (error) {
        console.error('Error running Puppeteer script:', error);
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});