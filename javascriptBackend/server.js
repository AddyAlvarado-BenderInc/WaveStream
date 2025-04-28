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
    const scriptPath = path.join(folder, scriptName);
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

// Old csv extraction from previous server code, update as needed
async function extractCSVValues(csvFilePath) {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.createReadStream(csvFilePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                console.log('CSV parsed data:', results);

                const products = results.map(row => ({
                    nullSpace: row.null || "Intentionally Left Blank",
                    type: row.Type || "null",
                    productName: row.ItemName?.trim() || "",
                    displayName: row.DisplayName?.trim() || "",
                    itemTemplate: row.ItemTemplate?.trim() || "",
                    longDescription: row.LongDescription || "",
                    orderQuantity: row.OrderQuantity || "default",
                    advancedRange: row.AdvancedRange || "",
                    weightInput: row.WeightInput || "0",
                    rangeStart: row.RangeStart,
                    rangeEnd: row.RangeEnd || "",
                    regularPrice: parseFloat(row.RegularPrice).toFixed(4),
                    setupPrice: parseFloat(row.SetupPrice).toFixed(4),
                    icon: row.Icon || "null",
                    pdfUpload: row.PDFUploadName,
                    ticketTemplate: row.TicketTemplates || "default", // PACE IT 4/0 is default
                    shippingWidth: row.ShippingWidth || "9",
                    shippingLength: row.ShippingLength || "12",
                    shippingHeight: row.ShippingHeight || "12",
                    shippingMaxQtyPerSub: row.ShippingMaxQtyPerSub || "500",
                    buyerConfig: row.BuyerConfiguration || false,
                    skipProduct: row.SkipProduct || false,
                    maxQuantity: row.MaxQty || "default",
                    showQtyPrice: row.ShowQtyPrice || false,
                }));

                console.log('Products:', products);
                resolve(products);
            })
            .on('error', (error) => reject(error));
    });
}

async function differentializeProductData(type, runOption, cellOrigin, data) {
    const results = Array.isArray(data.jsonData) ? data.jsonData : [];

    if (results.length === 0) {
        console.error("No valid JSON data found!");
        return [];
    }

    const products = results.map(row => ({
        productName: row.ItemName?.trim() || "Unnamed Product", // Use default name if empty
        displayName: row.DisplayName?.trim() || "Untitled Product",
        rangeStart: row.RangeStart || "0", // Default range start
        rangeEnd: row.RangeEnd || "0", // Default range end
        regularPrice: row.RegularPrice ? parseFloat(row.RegularPrice).toFixed(4) : "0.0000", // Default price
        setupPrice: row.SetupPrice?.Composite || [], // Extract composite array
        type: row.Type || "General", // Default product type
        longDescription: row.LongDescription?.trim() || "No description provided",
        briefDescription: row.BriefDescription?.trim() || "No brief description",
        orderQuantity: row.OrderQuantity || "1", // Default order quantity
        advancedRange: row.AdvancedRange || "",
        icon: row.Icon || "No Icon",
        pdfUpload: row.PDFUploadName || "No PDF",
        ticketTemplate: row.TicketTemplates || "Default Template",
        shippingWidth: row.ShippingWidth || "0",
        shippingLength: row.ShippingLength || "0",
        shippingHeight: row.ShippingHeight || "0",
        shippingMaxQtyPerSub: row.ShippingMaxQtyPerSub || "Unlimited",
        itemTemplate: row.ItemTemplate || "Default Template",
        buyerConfig: row.BuyerConfiguration || false,
        skipProduct: row.SkipProduct || false,
        weightInput: row.WeightInput || "0",
    }));

    console.log("Processed Products for Automation:", products);

    return products;
}

app.post('/js-server', upload.single('file'), async (req, res) => {
    const { type, runOption, cellOrigin, jsonData } = req.body;

    console.log(`Run Option: ${runOption}`);
    console.log(`Type: ${type}`);
    console.log(`Cell Origin:`, cellOrigin);

    try {
        let products = [];
        if (type === 'csv-type' && req.file) {
            const csvFilePath = req.file.path;
            products = await extractCSVValues(csvFilePath);
        } else if (type === 'json-type' && jsonData) {
            products = await differentializeProductData(type, runOption, cellOrigin, { jsonData });
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
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});