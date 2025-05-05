const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const multer = require('multer');
const csvParser = require('csv-parser');
const axios = require('axios');
const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3002;
let setStandardBehavior = false;

const ICONS_DIR = path.join(__dirname, 'icons');
const PDFS_DIR = path.join(__dirname, 'pdfs');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const upload = multer({ dest: UPLOADS_DIR });

app.use(express.json());
app.use(cors());

const loadPuppeteerScript = (folder, scriptName) => {
    const scriptPath = path.join(__dirname, folder, scriptName);
    return require(scriptPath);
};

const autoDeleteOldUploads = async () => {
    try {
        await fsPromises.mkdir(UPLOADS_DIR, { recursive: true });
        const files = await fsPromises.readdir(UPLOADS_DIR);
        const deletePromises = files.map(async (file) => {
            const filePath = path.join(UPLOADS_DIR, file);
            try {
                const stats = await fsPromises.stat(filePath);
                if (stats.isFile()) {
                    await fsPromises.unlink(filePath);
                    console.log(`Deleted upload file: ${file}`);
                } else {
                    console.log(`Skipping non-file in uploads: ${file}`);
                }
            } catch (err) {
                console.error(`Error deleting upload file: ${file}`, err);
            }
        });

        await Promise.all(deletePromises);
        console.log('All old uploads deleted.');
    } catch (err) {
        console.error('Error reading uploads directory:', err);
    }
};

const downloadImage = async (url, filepath) => {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        if (response.status !== 200) {
            throw new Error(`Failed to download ${url}. Status: ${response.status}`);
        }

        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });
    } catch (error) {
        console.error(`Error downloading image from ${url}:`, error.message);
        throw error;
    }
};

const autoDeleteOldIcons = async () => {
    try {
        await fsPromises.mkdir(ICONS_DIR, { recursive: true });
        const files = await fsPromises.readdir(ICONS_DIR);

        const deletePromises = files.map(async (file) => {
            const filePath = path.join(ICONS_DIR, file);
            try {
                const stats = await fsPromises.stat(filePath);
                if (stats.isFile()) {
                    await fsPromises.unlink(filePath);
                    console.log(`Deleted icon file: ${file}`);
                } else {
                    console.log(`Skipping non-file in icons: ${file}`);
                }
            } catch (err) {
                console.error(`Error deleting icon file: ${file}`, err);
            }
        });

        await Promise.all(deletePromises);
        console.log('All old icons deleted.');
    } catch (err) {
        console.error('Error reading icons directory:', err);
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

    if (type === 'json-type' && fileData.jsonData) {
        try {
            products = JSON.parse(fileData.jsonData);

            await fsPromises.mkdir(ICONS_DIR, { recursive: true });
            await fsPromises.mkdir(PDFS_DIR, { recursive: true });

            for (const product of products) {
                const iconData = product?.Icon?.Package?.content;
                const iconFilenames = iconData?.filename;
                const iconUrls = iconData?.url;

                if (iconData && Array.isArray(iconFilenames) && Array.isArray(iconUrls) && iconFilenames.length === iconUrls.length && iconFilenames.length > 0) {
                    console.log(`Processing package icons for product: ${product.ItemName || product.DisplayName || 'Unknown'}`);
                    const iconDownloadPromises = [];

                    for (let i = 0; i < iconUrls.length; i++) {
                        const url = iconUrls[i];
                        const filename = iconFilenames[i];
                        if (url && filename) {
                            const filepath = path.join(ICONS_DIR, filename);
                            console.log(`  Queueing download: ${url} -> ${filepath}`);
                            iconDownloadPromises.push(downloadImage(url, filepath));
                        }
                    }

                    try {
                        await Promise.all(iconDownloadPromises);
                        console.log(`  Downloads complete for product icons. Transforming Icon field.`);
                        product.Icon = { Composite: iconFilenames };
                    } catch (downloadError) {
                        console.error(`  Failed to download one or more icons for product. Icon field not transformed. Error: ${downloadError.message}`);
                    }
                } else if (product?.Icon?.Package) {
                    console.log(`  Skipping Icon transformation for product ${product.ItemName || 'Unknown'}: Invalid or empty package content.`);
                }

                const pdfData = product?.PDFUploadName?.Package?.content;
                const pdfFilenames = pdfData?.filename;
                const pdfUrls = pdfData?.url;

                if (pdfData && Array.isArray(pdfFilenames) && Array.isArray(pdfUrls) && pdfFilenames.length === pdfUrls.length && pdfFilenames.length > 0) {
                    console.log(`Processing package PDFs for product: ${product.ItemName || product.DisplayName || 'Unknown'}`);
                    const pdfDownloadPromises = [];

                    for (let i = 0; i < pdfUrls.length; i++) {
                        const url = pdfUrls[i];
                        const filename = pdfFilenames[i];
                        if (url && filename) {
                            const filepath = path.join(PDFS_DIR, filename);
                            console.log(`  Queueing download: ${url} -> ${filepath}`);
                            pdfDownloadPromises.push(downloadImage(url, filepath));
                        }
                    }

                    try {
                        await Promise.all(pdfDownloadPromises);
                        console.log(`  Downloads complete for product PDFs. Transforming PDFUploadName field.`);
                        product.PDFUploadName = { Composite: pdfFilenames };
                    } catch (downloadError) {
                        console.error(`  Failed to download one or more PDFs for product. PDFUploadName field not transformed. Error: ${downloadError.message}`);
                    }
                } else if (product?.PDFUploadName?.Package) {
                    console.log(`  Skipping PDF transformation for product ${product.ItemName || 'Unknown'}: Invalid or empty package content.`);
                }
            }

            products = removeEmptyValues(products);

        } catch (error) {
            console.error('Error parsing or processing JSON data:', error);
            throw new Error('Invalid JSON data or processing error');
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

app.post('/close-browser', async (req, res) => {
    try {
        const puppeteerScript = loadPuppeteerScript('automation', 'DSF_product_edit.js');
        await puppeteerScript.closeBrowser();
        setStandardBehavior = true;
        res.json({ message: 'Browser closed successfully' });
    } catch (error) {
        console.error('Error closing the Puppeteer browser:', error);
        res.status(500).json({ message: 'Failed to close the browser', error: error.message });
    }
});

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

        products = await differentializeProductData(type, { jsonData });

        console.log('Processed & Transformed Products:', JSON.stringify(products, null, 2));
        console.log('END OF PROCESSING');

        if (!Array.isArray(products) || products.length === 0) {
            throw new Error('No valid products found after processing');
        }

        const puppeteerScript = loadPuppeteerScript('automation', 'DSF_product_edit.js');
        await puppeteerScript.runPuppeteer(products);

        res.json({ message: 'Automation script executed successfully', products });
        await autoDeleteOldUploads();
        await autoDeleteOldIcons();

    } catch (error) {
        console.error('Error in /js-server route:', error);
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});