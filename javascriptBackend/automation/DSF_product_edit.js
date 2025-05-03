const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sound = require('sound-play');
const sgMail = require('@sendgrid/mail');
const { error, debug } = require('console');

const activateSound = path.join(__dirname, 'sounds', 'activate.wav');
const errorSound = path.join(__dirname, 'sounds', 'error.wav');
const successSound = path.join(__dirname, 'sounds', 'success.wav');

const username = process.env.DSF_USERNAME;
const password = process.env.DSF_PASSWORD;
const sendgridApi = process.env.SENDGRID_API_KEY;;

const userEmail = process.env.USER_EMAIL;
const secondaryEmail = process.env.SECONDARY_EMAIL;

let browser = null;
const platform = process.platform;

async function sendSuccessEmail(processProductCount, products) {
    sgMail.setApiKey(sendgridApi)
    const msg = {
        to: [userEmail, secondaryEmail],
        from: 'retailcs@bender-inc.com',
        subject: `Success ✅ Autofill For ${processProductCount} Products Are Complete!`,
        html:
            `<span>
                <h1>The Following Products Have Been Autofilled</h1>
                <br />
                <span>
                    <p>${products.map(product => product.ItemName).join('<br />')}</p>
                </span>
            </span>
            `,
    }
    sgMail
        .send(msg)
        .then(() => {
            console.log('Success Message Sent!')
        })
        .catch((error) => {
            console.error(error)
        })
};

async function sendFailureEmail(processProductCount, products, error) {
    sgMail.setApiKey(sendgridApi);

    function countIsZero(count) {
        if (count === 0) {
            return "Starting product";
        }
        return "product " + (count + 1);
    }

    function generateHighlightedProductList(count, products) {
        return products.map((product, index) => {
            const productLine = `${product.ItemName}`;
            if (index === count) {
                return `<div style="background-color: #ffcccc; padding: 4px; border-radius: 4px;">${productLine} ❌ </div>`;
            }
            return `<div>${productLine}</div>`;
        }).join('');
    }

    const msg = {
        to: [userEmail, secondaryEmail],
        from: 'retailcs@bender-inc.com',
        subject: `Failure at ${countIsZero(processProductCount)} ❌`,
        html: `
            <span>
                <strong>Error occurred while processing:</strong><br /> 
                ${generateHighlightedProductList(processProductCount, products)}
                <br />
                <strong>Error:</strong> ${error}<br /><br />
            </span>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log('Failure Message Sent!');
    } catch (err) {
        console.error('Error sending failure email:', err);
    }
}

function ensureFileExists(filePath, contextMessage) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`${contextMessage}: File not found at "${filePath}"`);
    }
}

const globalWidth = 1920;
const globalHeight = 1080;

const ticketSelectorValues = {
    "default": "100289",
    "4/4": "100290",
    "4/0_No_Special_Instructions": "100520",
    "4/4_No_Special_Instructions": "100521",
}

async function completeDelete(newPage, osPlatform) {
    console.log(`Performing 'Select All' for platform: ${osPlatform}`);

    const modifierKey = osPlatform === 'darwin' ? 'Meta' : 'Control';

    console.log(`Using modifier key: ${modifierKey}`);

    await newPage.keyboard.down(modifierKey);
    await newPage.keyboard.press('A');
    await newPage.keyboard.up(modifierKey);

    console.log('Performing delete/backspace...');
    await newPage.keyboard.press('Backspace');

    console.log('Delete action complete.');
};

async function detectCompositeProduct(product) {
    if (Object.keys(product).includes('Composite')) {
        console.log('Composite product detected');
        const compositeRange = Array.isArray(product)
            ? product.map(item => item.Composite).length
            : typeof product.Composite === 'object'
                ? Object.keys(product.Composite).length
                : 0;

        console.log('Composite range length: ', compositeRange);
        return compositeRange;
    };
    console.log('Composite product not detected');
    return 0;
};

async function ticketTemplateSelector(templates, newPage) {
    const ticketSelector = 'select[name="ctl00$ctl00$C$M$ctl00$W$ctl03$TicketTemplates"]';

    await newPage.waitForSelector(ticketSelector);
    if (ticketSelectorValues[templates]) {
        const valueToSelect = ticketSelectorValues[templates];

        await newPage.select(ticketSelector, valueToSelect);
        console.log(`Selected ticket template: ${templates}`);

        return valueToSelect;
    }
    else {
        console.error(`Ticket template "${templates}" not found in ticketSelectorValues`);
        return null;
    }
}

async function uploadIcon(newPage, iconData) {
    const editMainIconButtonSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$EditProductImage"]';
    const uploadMainIconRadioSelector = '#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_rdbUploadIcon';
    const mainIconUploadInputSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$_uploadedFile$ctl01"]';
    const useSameImageIconCheckboxSelector = '#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_ChkUseSameImageIcon';
    const uploadMainIconButtonSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$Upload"]';
    const detailsTabSelector = '#TabDetails';
    const infoTabSelector = '#TabInfo';
    const firstDeleteButtonSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_MultipleImagesUpload$ImagesPreview$ctl01$ctl01"]';
    const imagePreviewSelector = '.multiple-images-container-action';
    const uploadMultipleImagesRadioSelector = '#ctl00_ctl00_C_M_ctl00_W_ctl01__MultipleImagesUpload_RadioUploadMultipleImages';
    const multipleImagesUploadInputSelector = '#ctl00_ctl00_C_M_ctl00_W_ctl01__MultipleImagesUpload_UploadImages';
    const uploadMultipleImagesButtonSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_MultipleImagesUpload$UploadedFile"]';

    try {
        const filenames = iconData?.Composite;
        if (!Array.isArray(filenames) || filenames.length === 0) {
            console.log('No valid composite icon data found. Skipping icon upload.');
            return;
        }
        console.log(`Processing ${filenames.length} composite icons:`, filenames);

        const firstIconFilename = filenames[0];
        const firstIconPath = path.join(__dirname, '..', 'icons', firstIconFilename);
        ensureFileExists(firstIconPath, `First icon (${firstIconFilename})`);
        console.log(`Uploading first icon as main icon: ${firstIconFilename}`);

        await newPage.waitForSelector(editMainIconButtonSelector, { visible: true });
        await newPage.click(editMainIconButtonSelector);
        console.log('Clicked Edit Main Icon button.');

        await newPage.waitForSelector(uploadMainIconRadioSelector, { visible: true });
        await newPage.click(uploadMainIconRadioSelector);
        console.log('Selected Upload Main Icon radio.');

        const mainIconUploadInput = await newPage.waitForSelector(mainIconUploadInputSelector);
        await mainIconUploadInput.uploadFile(firstIconPath);
        console.log(`Selected file for main icon: ${firstIconPath}`);

        await newPage.waitForSelector(useSameImageIconCheckboxSelector, { visible: true });
        await newPage.click(useSameImageIconCheckboxSelector);
        console.log('Checked "Use same image for icon".');

        console.log('Clicking Upload for main icon...');
        await Promise.all([
            newPage.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
            newPage.click(uploadMainIconButtonSelector)
        ]);
        console.log(`Main icon (${firstIconFilename}) uploaded successfully.`);

        if (filenames.length > 0) {
            console.log(`Proceeding to upload all ${filenames.length} icons to multiple images section...`);
            await newPage.waitForSelector(detailsTabSelector, { visible: true });
            await newPage.click(detailsTabSelector);
            console.log('Navigated to Details tab.');

            const maxDeleteAttempts = 15;
            let currentDeleteAttempt = 0;
            console.log('Attempting to delete existing additional images based on image count...');

            while (currentDeleteAttempt < maxDeleteAttempts) {
                let imageCount = 0;
                if (!imagePreviewSelector) {
                    console.error(`Image preview selector is not defined!`);
                    break;
                } else {
                    console.log(`   Image preview selector "${imagePreviewSelector}" found. Counting images...`);
                }
                try {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    imageCount = await newPage.$$eval(imagePreviewSelector, images =>
                        images.filter(img => img.offsetParent !== null).length
                    );
                    console.log(`   Found ${imageCount} existing visible images (Attempt ${currentDeleteAttempt + 1}).`);
                } catch (e) {
                    console.log(`   Image preview selector "${imagePreviewSelector}" not found or evaluation failed. Assuming 0 images.`);
                    imageCount = 0;
                }

                if (imageCount === 0) {
                    console.log('   No more visible images to delete.');
                    break;
                }

                try {
                    console.log(`   Attempting to click delete button for first remaining image (Attempt ${currentDeleteAttempt + 1})...`);
                    await newPage.waitForSelector(firstDeleteButtonSelector, { visible: true, timeout: 5000 });
                    await newPage.click(firstDeleteButtonSelector);
                    console.log(`   Clicked delete. Waiting for UI update...`);
                    await new Promise(resolve => setTimeout(resolve, 800));
                } catch (error) {
                    console.error(`   Error finding or clicking delete button (Attempt ${currentDeleteAttempt + 1}): ${error.message}`);
                    console.warn('   Stopping delete process due to error.');
                    break;
                }
                currentDeleteAttempt++;
            }

            if (currentDeleteAttempt >= maxDeleteAttempts) {
                console.warn('Reached max delete attempts. There might still be images left, or counting failed.');
            }
            console.log(`Finished delete process after ${currentDeleteAttempt} attempts.`);

            await newPage.waitForSelector(uploadMultipleImagesRadioSelector, { visible: true });
            await newPage.click(uploadMultipleImagesRadioSelector);
            console.log('Selected Upload Multiple Images radio.');

            const validFilePaths = [];
            for (const filename of filenames) {
                const currentPath = path.join(__dirname, '..', 'icons', filename);
                if (fs.existsSync(currentPath)) {
                    validFilePaths.push(currentPath);
                } else {
                    console.warn(`Skipping missing file for multi-upload: ${currentPath}`);
                }
            }

            if (validFilePaths.length > 0) {
                console.log(`Attempting to upload ${validFilePaths.length} files with retries...`);

                let uploadSuccess = false;
                const maxRetries = 2;
                let attempt = 0;

                while (attempt <= maxRetries && !uploadSuccess) {
                    attempt++;
                    console.log(`Attempt ${attempt}/${maxRetries + 1}: Selecting files and clicking Upload...`);

                    try {
                        console.log(`   (Attempt ${attempt}) Locating file input...`);
                        const multipleImagesInput = await newPage.waitForSelector(multipleImagesUploadInputSelector, { visible: true, timeout: 5000 });
                        console.log(`   (Attempt ${attempt}) Uploading files: ${validFilePaths.join(', ')}`);
                        await multipleImagesInput.uploadFile(...validFilePaths);
                        console.log(`   (Attempt ${attempt}) Files selected.`);

                        await newPage.waitForSelector(uploadMultipleImagesButtonSelector, { visible: true, timeout: 5000 });
                        console.log(`   (Attempt ${attempt}) Clicking upload button...`);
                        await newPage.click(uploadMultipleImagesButtonSelector);
                        console.log(`   (Attempt ${attempt}) Clicked. Waiting for network idle...`);
                        await newPage.waitForNetworkIdle({ idleTime: 1500, timeout: 60000 });

                        console.log(`   (Attempt ${attempt}) Checking for image previews using selector: "${imagePreviewSelector}"`);
                        try {
                            await newPage.waitForSelector(imagePreviewSelector, { visible: true, timeout: 8000 });
                            console.log(`   (Attempt ${attempt}) Image previews FOUND. Upload successful.`);
                            uploadSuccess = true;
                        } catch (previewError) {
                            console.warn(`   (Attempt ${attempt}) Image previews NOT found after network idle.`);
                            if (attempt > maxRetries) {
                                console.error(`   Max retries reached. Upload failed.`);
                            } else {
                                console.log(`   Waiting before retry...`);
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                        }
                    } catch (uploadError) {
                        console.error(`   (Attempt ${attempt}) Error during upload process: ${uploadError.message}`);
                        if (attempt > maxRetries) {
                            console.error(`   Max retries reached after error.`);
                        } else {
                            console.log(`   Waiting before retry after error...`);
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    }
                }

                if (!uploadSuccess) {
                    throw new Error(`Failed to confirm multiple image upload after ${maxRetries + 1} attempts.`);
                }
                console.log(`Successfully confirmed upload of ${validFilePaths.length} files.`);

            } else {
                console.log("No valid icon files found to upload for multiple images section.");
            }

            console.log('Ensuring Info tab is ready before clicking...');
            await newPage.waitForSelector(infoTabSelector, { visible: true, timeout: 10000 });
            await newPage.click(infoTabSelector);
            console.log('Returned to Info tab.');

        } else {
            console.log("No filenames provided for multiple image upload section.");
        }

    } catch (error) {
        console.error(`Error during icon upload process: ${error.message}`);
        throw error;
    }
}


// TODO: Need to have composite check
async function uploadPDF(newPage, pdf) {
    const fileDeleteButton = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl02$FilesAddedToJob1$FileRepeater$ctl01$UF$DEL"]';
    const filePath = path.join(__dirname, 'pdfs', pdf);

    if (!fs.existsSync(filePath)) {
        console.error(`PDF "${pdf}" not found in ./pdf directory. Skipping upload procedure`);
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    if (await newPage.$(fileDeleteButton)) {
        console.log('Deleting existing file');
        newPage.once('dialog', async (dialog) => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });
        await newPage.click(fileDeleteButton);
    }
    await new Promise(resolve => setTimeout(resolve, 800));
    await console.log(`Uploading pdf ${pdf}`);

    const uploadSelector = await newPage.$('input[name="ctl00$ctl00$C$M$ctl00$W$ctl02$Fileupload1$htmlInputFileUpload"]');
    await uploadSelector.uploadFile(filePath);

    await new Promise(resolve => setTimeout(resolve, 800));
    await newPage.waitForSelector('input[name="ctl00$ctl00$C$M$ctl00$W$ctl02$Fileupload1$ButtonUpload"]');
    await newPage.click('input[name="ctl00$ctl00$C$M$ctl00$W$ctl02$Fileupload1$ButtonUpload"]');

    console.log(`Successfully uploaded pdf ${pdf}`);
}

async function simulateMouseMove(newPage, selector) {
    try {
        const elementHandle = await newPage.$(selector);
        if (!elementHandle) {
            throw new Error(`Element not found for selector: ${selector}`);
        }

        const boundingBox = await elementHandle.boundingBox();
        if (!boundingBox) {
            throw new Error(`Could not retrieve bounding box for selector: ${selector}`);
        }

        const x = boundingBox.x + boundingBox.width / 2;
        const y = boundingBox.y + boundingBox.height / 2;

        await newPage.mouse.move(x, y);
        console.log(`Mouse moved to (${x}, ${y})`);
        await newPage.mouse.click(x, y);
        console.log(`Clicked on the element at (${x}, ${y})`);
    } catch (error) {
        console.error(`Error in simulateMouseMove: ${error.message}`);
    }
};

async function tryOpenNewPage(browser, page, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const [newPage] = await Promise.all([
                new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error("New page didn't open within the timeout")), 20000);
                    browser.once('targetcreated', async (target) => {
                        const newPage = await target.page();
                        await newPage.setViewport({ width: globalWidth, height: globalHeight });
                        if (newPage) {
                            clearTimeout(timeout);
                            resolve(newPage);
                        }
                    });
                }),
                page.click('a.pointerCursor.ng-star-inserted'),
            ]);

            if (newPage) {
                return newPage;
            }
        } catch (error) {
            retries++;
            console.log(`Retry ${retries}/${maxRetries}: ${error.message}`);
            if (retries >= maxRetries) {
                console.error(`product `);
                throw new Error(`Failed to open a new page after ${retries} attempts`);
            }
        }
    }
};

async function detectMultipleRanges(newPage) {
    let page = newPage;
    let rangeCount = 0;

    const ranges = await page.$$('[id^="tbl_0_PriceCatalog_rngbegin_"]');

    ranges.forEach(() => {
        rangeCount++;
    });

    console.log(`Found ${rangeCount} ranges.`);
    return rangeCount;
};

async function detectFilledDetails(newPage, product) {
    const longDescriptions = product.LongDescription;
    const evaluation = await newPage.$eval('textarea.reTextArea', el => el.textContent);

    console.log('Text Populating the text area: ', evaluation);

    await newPage.$('textarea.reTextArea');
    console.log('Found text area');
    if (evaluation === longDescriptions) {
        console.log('Product details are filled with correct details.');
        return true;
    }
    console.log('Product details are not filled with correct details. Expected: ', longDescriptions);
    return false;
};

async function fillItemTemplate(newPage, product) {
    const itemTemplateSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$txtMISEstimateId"]';
    await newPage.waitForSelector(itemTemplateSelector);
    await newPage.click(itemTemplateSelector);
    await completeDelete(newPage, platform);
    await newPage.type(itemTemplateSelector, product.ItemTemplate);
}

async function fillProductInfo(newPage, product) {
    let nameDisplay = product.DisplayName ? product.DisplayName : "";
    const displayNameSelector = '#ctl00_ctl00_C_M_ctl00_W_ctl01__StorefrontName';
    await newPage.waitForSelector(displayNameSelector);
    console.log('Display selector found!')
    await newPage.click(displayNameSelector, { clickCount: 4 });
    await new Promise(resolve => setTimeout(resolve, 600));
    await completeDelete(newPage, platform);
    await newPage.type(displayNameSelector, nameDisplay);
    await console.log('Display name typed: ', nameDisplay);
};

async function fillPricingForm(newPage, startingRange, endingRange, regularPrices, setupPrices) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Fill pricing procedure called');

    const deleteRangeButton = 'img[onclick^="Javascript:delRow"][height="17"][width="16"]';
    const addRangeButton = '#ctl00_ctl00_C_M_ctl00_W_ctl01_GridViewPricesheets_ctl02_PriceItemFrame_imageplushid_PriceCatalog';
    const multipleRanges = await detectMultipleRanges(newPage);
    console.log('Multiple ranges detected: ', multipleRanges);

    const compositeLength = await detectCompositeProduct(endingRange);
    if (!compositeLength) {
        console.log('No composite length detected');
    }

    if (multipleRanges !== compositeLength) {
        console.log('Found ranges exceeds our composite length.');
        await newPage.$(deleteRangeButton);
        await newPage.waitForSelector(deleteRangeButton);
        for (let i = 1; i < multipleRanges; i++) {
            await newPage.click(deleteRangeButton);
            await console.log('Deleted range offset: ', i);
        }
        await newPage.waitForSelector(addRangeButton);
        for (let i = 2; i < compositeLength; i++) {
            await newPage.click(addRangeButton);
        }
        await console.log('Added range!', compositeLength);
    } else if (detectMultipleRanges(newPage) === compositeLength) {
        console.log('Multiple ranges detected and matches composite length');
    } else {
        console.log('Multiple ranges not detected. Proceeding with range input.');
    };

    if (startingRange) {
        if (await detectCompositeProduct(startingRange)) {
            console.log('Composite product detected for starting range');
            const startingRangeComposite = Object.values(startingRange).toString().split(',');
            for (let i = 1; i < compositeLength; i++) {
                const beginRangeSelector = `#tbl_0_PriceCatalog_rngbegin_${[i]}`;
                await newPage.waitForSelector(beginRangeSelector);
                await newPage.click(beginRangeSelector, { clickCount: 4 });
                await new Promise(resolve => setTimeout(resolve, 150));
                await completeDelete(newPage, platform);
                await newPage.type(beginRangeSelector, startingRangeComposite[i - 1]);
                await console.log('Filled beginning range with: ', startingRangeComposite[i - 1]);
            }
        } else {
            console.log('No composite length detected for starting range, filling for single range');
            const beginRangeSelector = `#tbl_0_PriceCatalog_rngbegin_1`;
            await newPage.waitForSelector(beginRangeSelector);
            await newPage.click(beginRangeSelector, { clickCount: 4 });
            await new Promise(resolve => setTimeout(resolve, 600));
            await completeDelete(newPage, platform);
            await newPage.type(beginRangeSelector, startingRange);
            await console.log('Filled beginning range with: ', startingRange);
        }
    } else {
        console.log(`Start Range field empty or not found. Skipping.`);
    };

    if (endingRange) {
        if (await detectCompositeProduct(endingRange)) {
            console.log('Composite product detected for ending range');
            const endingRangeComposite = Object.values(endingRange).toString().split(',');
            for (let i = 1; i < compositeLength; i++) {
                const endRangeSelector = `#tbl_0_PriceCatalog_rngend_${[i]}`;
                await newPage.waitForSelector(endRangeSelector);
                await newPage.click(endRangeSelector, { clickCount: 4 });
                await new Promise(resolve => setTimeout(resolve, 150));
                await completeDelete(newPage, platform);
                await newPage.type(endRangeSelector, endingRangeComposite[i - 1]);
                await console.log('Filled ending range with: ', endingRangeComposite[i - 1]);
            }
        } else {
            console.log('No composite length detected for ending range, filling for single range');
            const endRangeSelector = `#tbl_0_PriceCatalog_rngend_1`;
            await newPage.waitForSelector(endRangeSelector);
            await newPage.click(endRangeSelector, { clickCount: 4 });
            await new Promise(resolve => setTimeout(resolve, 600));
            await completeDelete(newPage, platform);
            await console.log('Pressed backspace');
            await newPage.type(endRangeSelector, endingRange);
            await new Promise(resolve => setTimeout(resolve, 600));
            await console.log('Filled ending range with: ', endingRange);
        }
    } else {
        console.log(`End Range field empty or not found. Skipping.`);
    };

    if (regularPrices) {
        if (await detectCompositeProduct(regularPrices)) {
            console.log('Composite product detected for regular price');
            const regularPricesComposite = Object.values(regularPrices).toString().split(',');
            for (let i = 1; i < compositeLength; i++) {
                const regularPriceSelector = `#tbl_0_PriceCatalog_regularprice_${[i]}`;
                await newPage.waitForSelector(regularPriceSelector);
                await newPage.click(regularPriceSelector, { clickCount: 4 });
                await new Promise(resolve => setTimeout(resolve, 150));
                await completeDelete(newPage, platform);
                await newPage.type(regularPriceSelector, regularPricesComposite[i - 1]);
                await console.log('Filled regular price with: ', regularPricesComposite[i - 1]);
            }
        } else {
            console.log('No composite length detected for regular price, filling for single range');
            const regularPriceSelector = `#tbl_0_PriceCatalog_regularprice_1`;
            await newPage.waitForSelector(regularPriceSelector);
            await newPage.click(regularPriceSelector, { clickCount: 4 });
            console.log('Clicked regular price');
            await new Promise(resolve => setTimeout(resolve, 600));
            await completeDelete(newPage, platform);
            await newPage.type(regularPriceSelector, regularPrices);
            await console.log('Filled regular price with: ', regularPrices);
        }
    } else {
        console.log(`Regular Price field empty or not found. Skipping.`);
    };

    if (setupPrices) {
        if (await detectCompositeProduct(setupPrices)) {
            console.log('Composite product detected for setup price');
            const setupPricesComposite = Object.values(setupPrices).toString().split(',');
            for (let i = 1; i < compositeLength; i++) {
                const setupPriceSelector = `#tbl_0_PriceCatalog_setupprice_${[i]}`;
                await newPage.waitForSelector(setupPriceSelector);
                await newPage.click(setupPriceSelector, { clickCount: 4 });
                await new Promise(resolve => setTimeout(resolve, 150));
                await completeDelete(newPage, platform);
                await newPage.type(setupPriceSelector, setupPricesComposite[i - 1]);
                await console.log('Filled setup price with: ', setupPricesComposite[i - 1]);
            }
        } else {
            console.log('No composite length detected for setup price, filling for single range');
            const setupPriceSelector = `#tbl_0_PriceCatalog_setupprice_1`;
            await newPage.waitForSelector(setupPriceSelector);
            await newPage.click(setupPriceSelector, { clickCount: 4 });
            console.log('Clicked setup price');
            await new Promise(resolve => setTimeout(resolve, 600));
            await completeDelete(newPage, platform);
            await newPage.type(setupPriceSelector, setupPrices);
            await console.log('Filled setup price with: ', setupPrices);
        }
    } else {
        console.log(`Setup Price field empty or not found. Skipping.`);
    };

    await new Promise(resolve => setTimeout(resolve, 600));
    await newPage.waitForSelector('img[title="Copy Range"]');
    await newPage.click('img[title="Copy Range"]');
    await console.log('Copied Range');

    await new Promise(resolve => setTimeout(resolve, 600));
    await newPage.waitForSelector('img[title="Paste All"]');
    await newPage.click('img[title="Paste All"]');
    await console.log('Pasted Range');
    await new Promise(resolve => setTimeout(resolve, 1000));
};

async function fillLongDescription(newPage, product) {
    const longDescriptions = product.LongDescription;
    const longDescriptionField = 'textarea.reTextArea';
    if (await newPage.$(longDescriptionField)) {
        console.log('Long Description field exists');
        await newPage.waitForSelector(longDescriptionField);
        await newPage.click(longDescriptionField, { clickCount: 4 });
        await completeDelete(newPage, platform);
        await newPage.type(longDescriptionField, longDescriptions);
        console.log('Long Description field filled');
    }
};

async function processProduct(browser, page, product) {
    const anyQuantitiesButton = '#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl__AnyQuantities';
    const advancedQuantitiesButton = '#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl__Advanced';
    const productNameSelector = '#ctl00_ctl00_C_M_ctl00_W_ctl01__Name';
    const productName = product.ItemName;
    const advancedRanges = product.AdvancedRange;
    const orderQuantities = product.OrderQuantity;
    const icon = product.Icon;
    const pdf = product.PDFUploadName;
    const ticketTemplates = product.TicketTemplate;
    const shippingWidths = product.ShippingWidth;
    const shippingLengths = product.ShippingLength;
    const shippingHeights = product.ShippingHeight;
    const shippingMaxs = product.ShippingMaxQtyPerSub;
    const buyerConfigs = product.BuyerCofiguration;
    const productType = product.Type;
    const weightInput = product.WeightInput;
    let maxQuantity = product.MaxQuantity;
    const showQtyPrice = product.ShowQtyPrice;
    const briefDescription = product.BriefDescription;

    const startingRange = product.RangeStart;
    const endingRange = product.RangeEnd;
    const regularPrices = product.RegularPrice;
    const setupPrices = product.SetupPrice;

    const skipProduct = product.SkipProduct;
    if (skipProduct) {
        console.log('Skipping product:', product.ItemName);
        return;
    }

    const validProductTypes = (productType) => {
        switch (productType) {
            case 'Static Document':
            case 'Ad Hoc':
            case 'Product Matrix':
            case 'Non Printed Products':
                return true;
            default:
                return false;
        }
    };

    if (!validProductTypes(productType)) {
        throw new Error(`Invalid product type: ${productType}`);
    } else if (productType === null || productType === '') {
        console.error('Product type cannot be empty!');
        return;
    }

    // TODO: in the future, we should scale this as a frontend toggle button
    const allowIconFields = true;
    const allowDescriptionFields = true;

    console.log('Processing for product:', product.ItemName);

    if (!product.ItemName || typeof product.ItemName !== 'string') {
        console.error('Invalid product name:', product.ItemName);
        throw new Error('Invalid product name');
    };

    await page.waitForSelector('input[name="globaleSearch"]');
    const searchBar = 'input[name="globaleSearch"]';

    await page.click(searchBar, { clickCount: 6 });

    await completeDelete(page, platform);

    await page.type(searchBar, product.ItemName);
    await page.keyboard.press('Enter');

    await new Promise(resolve => setTimeout(resolve, 3000));

    const newPage = await tryOpenNewPage(browser, page);
    await newPage.setViewport({ width: globalWidth, height: globalHeight });

    await newPage.$('body');
    await console.log("Found page");

    await newPage.waitForSelector('body');

    // TODO: In the future, it should be up to user preference whether they'd like to abort the process or skip the unmatching product name

    async function settingsTab(
        newPage,
        anyQuantitiesButton,
        advancedQuantitiesButton,
        advancedRanges,
        orderQuantities,
        shippingWidths,
        shippingLengths,
        shippingHeights,
        shippingMaxs,
        weightInput,
        maxQuantity,
        showQtyPrice,
    ) {
        const inputElement = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$_Expression"]';
        if (orderQuantities) {
            console.log('Order quantities found, proceeding with orderQuantities automation: ', orderQuantities);
            switch (orderQuantities) {
                case "AnyQuantity":
                    await newPage.waitForSelector(anyQuantitiesButton);
                    await newPage.click(anyQuantitiesButton);
                    await console.log('Clicked any quantities for selected quantity: ', orderQuantities);
                    break;
                case "SpecificQuantity":
                    await newPage.waitForSelector(advancedQuantitiesButton);
                    await newPage.click(advancedQuantitiesButton);
                    await console.log('Clicked advanced quantities for selected quantity: ', orderQuantities);
                    await newPage.waitForSelector(inputElement);
                    if (await newPage.$(inputElement)) {
                        console.log('Found input element');
                        await newPage.type(inputElement, advancedRanges);
                        await newPage.waitForSelector('#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl_btnDone');
                        await newPage.click('#ctl00_ctl00_C_M_ctl00_W_ctl01_OrderQuantitiesCtrl_btnDone');
                        console.log('Filled advanced ranges with: ', advancedRanges);
                    } else {
                        console.log('Input element not found');
                    }
                    break;
                default:
                    await newPage.waitForSelector(advancedQuantitiesButton);
                    await newPage.click(advancedQuantitiesButton);
                    await console.log('Nothing Specified, Assuming skip');
                    break;
            };
        } else {
            console.log('Order quantities not found, skipping!');
        }

        const maxQtySelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$txtMaxOrderQuantityPermitted"]';
        const showQtyPriceSelector = 'input[value="rdbShowPricing"]';

        if (maxQuantity) {
            const maxQtySelectorValue = await newPage.$eval(maxQtySelector, el => el.value.trim());
            console.log('Max quantity found: ', maxQuantity);
            if (maxQuantity === 'default' || maxQuantity === '') {
                maxQuantity = '';
            };

            if (maxQtySelectorValue === maxQuantity) {
                console.log('Max quantity already set to: ', maxQuantity);
            } else {
                if (await newPage.$(maxQtySelector)) {
                    console.log('Max quantity selector found and doesn\'t match', maxQtySelectorValue);
                    await newPage.waitForSelector(maxQtySelector);
                    await newPage.click(maxQtySelector, { clickCount: 4 });
                    await new Promise(resolve => setTimeout(resolve, 800));
                    await completeDelete(newPage, platform);
                    if (maxQtySelector !== maxQuantity) {
                        await newPage.type(maxQtySelector, maxQuantity);
                        console.log('Filled max quantity with: ', maxQuantity);
                    } else {
                        console.log('Max quantity is empty, skipping!');
                    }
                };
            };
        } else {
            console.log('Max quantity not found, skipping!');
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        if (showQtyPrice) {
            if (await newPage.$eval(showQtyPriceSelector, el => el.checked) === showQtyPrice) {
                console.log('Show quantity price already set to: ', showQtyPrice);
            } else {
                if (await newPage.$(showQtyPriceSelector)) {
                    console.log('Show quantity price selector found');
                    await newPage.waitForSelector(showQtyPriceSelector);
                    await newPage.click(showQtyPriceSelector);
                    console.log('Clicked show quantity price checkbox');
                };
            };
        }

        await page.evaluate(() => {
            document.activeElement?.blur();
        });
        await page.mouse.click(0, 0);

        const widthSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$_BoxX$_Length"]';
        const lengthSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$_BoxY$_Length"]';
        const heightSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$_BoxZ$_Length"]';
        const maxSelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$ShipmentDimensionCtrl$txtLotSize"]';

        if (productType !== 'Non Printed Products') {
            await newPage.evaluate(async () => {
                const scrollStep = 500;
                const delay = 50;

                const totalHeight = document.body.scrollHeight;
                const incrementOfTotalHeight = totalHeight * 0.25;
                let currentScrollPosition = 0;

                while (currentScrollPosition < incrementOfTotalHeight) {
                    window.scrollBy(0, scrollStep);
                    currentScrollPosition += scrollStep;

                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            });
        } else {
            await newPage.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
        };

        const printWeightCheckbox = '#ctl00_ctl00_C_M_ctl00_W_ctl01_OptionalPrintWeightCheckbox';
        const printWeightInput = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$OptionalPrintWeightSelector_Active$_Weight"]';
        const printWeightMeasurement = '#ctl00_ctl00_C_M_ctl00_W_ctl01_OptionalPrintWeightSelector_Active__Unit';
        const inputtedWeight = weightInput || '0.02';

        if (weightInput || shippingWidths || shippingLengths || shippingHeights || shippingMaxs) {
            if (await newPage.$(printWeightMeasurement)) {
                console.log('Print weight measurement selector found');
                if (await newPage.$eval(printWeightMeasurement, el => el.value) === '0') {
                    console.log('Print weight measurement at wrong measurement');
                    await newPage.waitForSelector(printWeightMeasurement);
                    await newPage.select(printWeightMeasurement, '1');
                    console.log('Changed weight measurement from oz to lb');
                } else {
                    console.log('Print weight measurement already set to lb');
                }
            } else {
                throw new Error('Print weight measurement selector not found');
            };

            if (weightInput) {
                console.log('Weight input found: ', weightInput);
                if (
                    await newPage.$(printWeightCheckbox) &&
                    await newPage.$eval(printWeightCheckbox, el => el.checked) === false &&
                    await newPage.$eval(printWeightInput, el => el.value.trim()) === '0'
                ) {
                    await newPage.waitForSelector(printWeightCheckbox);
                    await newPage.click(printWeightCheckbox);
                    console.log('Clicked print weight checkbox');
                    if (await newPage.$eval(printWeightInput, el => el.value.trim()) === '0') {
                        console.log('Processing Weight and adding: ', weightInput);
                        await newPage.waitForSelector(printWeightInput);
                        await newPage.click(printWeightInput, { clickCount: 4 });
                        await new Promise(resolve => setTimeout(resolve, 800));
                        await completeDelete(newPage, platform);
                        // TODO: we'll have to solve this later instead of hardcoding it, stupid freaking javascript and your unsexy dynamic type >:(
                        await newPage.keyboard.type(inputtedWeight);
                        console.log('Filled weight input with: ', inputtedWeight);
                    }
                } else if (
                    await newPage.$eval(printWeightCheckbox, el => el.checked) === true &&
                    await newPage.$eval(printWeightInput, el => el.value.trim()) === inputtedWeight
                ) {
                    console.log('Print weight checkbox already checked, skipping!');
                } else {
                    throw new Error('Print weight measurement not found');
                };
            } else {
                console.log('Print weight checkbox not found, skipping!');
            };

            await new Promise(resolve => setTimeout(resolve, 3000));
            if (shippingWidths) {
                console.log('Shipping widths found: ', shippingWidths);
                if (await newPage.$eval(widthSelector, el => el.value.trim()) !== shippingWidths) {
                    console.log('Processing Width');
                    await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl__lblBoxX');
                    await new Promise(resolve => setTimeout(resolve, 800));
                    await newPage.keyboard.press('Tab');

                    await completeDelete(newPage, platform);

                    await newPage.keyboard.type(shippingWidths);
                    if (await newPage.$eval(widthSelector, el => el.value.trim()) === shippingWidths) {
                        console.log('Completed filling shipping widths with: ', shippingWidths);
                    } else {
                        throw new Error('Failed to fill shipping widiths');
                    }
                } else {
                    console.log('Width is already set to: ', shippingWidths);
                };
            } else {
                console.log('Shipping widths not found, skipping!');
            };

            if (shippingLengths) {
                console.log('Shipping lengths found: ', shippingLengths);
                if (await newPage.$eval(lengthSelector, el => el.value.trim()) !== shippingLengths) {
                    console.log('Processing Length');
                    await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl__lblBoxY');
                    await newPage.keyboard.press('Tab');

                    await completeDelete(newPage, platform);

                    await newPage.keyboard.type(shippingLengths);
                    if (await newPage.$eval(lengthSelector, el => el.value.trim()) === shippingLengths) {
                        console.log('Completed filling shipping widths with: ', shippingLengths);
                    } else {
                        throw new Error('Failed to fill shipping lengths');
                    }
                } else {
                    console.log('Length is already set to: ', shippingLengths);
                };
            } else {
                console.log('Shipping lengths not found, skipping!');
            };

            if (shippingHeights) {
                console.log('Shipping heights found: ', shippingHeights);
                if (await newPage.$eval(heightSelector, el => el.value.trim()) !== shippingHeights) {
                    console.log('Processing Height');
                    await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl__lblBoxZ');
                    await newPage.keyboard.press('Tab');

                    await completeDelete(newPage, platform);

                    await newPage.keyboard.type(shippingHeights);
                    if (await newPage.$eval(heightSelector, el => el.value.trim()) === shippingHeights) {
                        console.log('Completed filling shipping widths with: ', shippingHeights);
                    } else {
                        throw new Error('Failed to fill shipping heights');
                    }
                } else {
                    console.log('Height is already set to: ', shippingHeights);
                };
            } else {
                console.log('Shipping heights not found, skipping!');
            };

            if (shippingMaxs) {
                console.log('Shipping maxs found: ', shippingMaxs);
                if (await newPage.$eval(maxSelector, el => el.value.trim()) !== shippingMaxs) {
                    console.log('Processing Max');
                    await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl_lblLotSize');
                    await newPage.keyboard.press('Tab');

                    await completeDelete(newPage, platform);

                    await newPage.keyboard.type(shippingMaxs);
                    if (await newPage.$eval(maxSelector, el => el.value.trim()) === shippingMaxs) {
                        console.log('Completed filling shipping widths with: ', shippingMaxs);
                    } else {
                        throw new Error('Failed to fill shipping maxs');
                    }
                } else {
                    console.log('Max is already set to: ', shippingMaxs);
                };
            } else {
                console.log('Shipping maxs not found, skipping!');
            };
        } else {
            console.log('Shipping dimensions not found, skipping!');
        }
    };

    async function productQueriedCheck(newPage, product) {
        await newPage.evaluate(() => {
            window.scrollTo(0, 0);
        });
        const queriedProduct = await newPage.$eval(
            'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_StorefrontName"]',
            el => el.value.trim()
        );
        if (queriedProduct === product.DisplayName) {
            console.log(`Product matches our display name: ${queriedProduct}, Skipping!`);
            return true;
        } else {
            console.log(`Product does not match our display name. Queried: ${queriedProduct}, Expected: ${product.DisplayName}`);
            return false;
        }
    };

    // TODO: in the future, we should scale this by having variables that the user
    // can access, rather than hardcoding it in the function. Or we can have a 
    // database that stores the previously queried values 

    async function productPriceMatches(newPage, startingRange, endingRange, regularPrices, setupPrices) {
        try {
            const beginRangeSelector = `input[value="${startingRange}"]`;
            const endRangeSelector = `input[value="${endingRange}"]`;
            const regularPriceSelector = `input[value="${regularPrices}"]`;
            const setupPriceSelector = `input[value="${setupPrices}"]`;

            const startingRangeEvaluation = await newPage.$eval(beginRangeSelector, el => el.value.trim());
            const endingRangeEvaluation = await newPage.$eval(endRangeSelector, el => el.value.trim());
            const regularPriceEvaluation = await newPage.$eval(regularPriceSelector, el => el.value);
            const setupPriceEvaluation = await newPage.$eval(setupPriceSelector, el => el.value);
            if (startingRangeEvaluation === startingRange && endingRangeEvaluation === endingRange && regularPriceEvaluation === regularPrices && setupPriceEvaluation === setupPrices) {
                console.log(`Product matches our price range and prices: ${startingRange} - ${endingRange}, Regular Price: ${regularPriceEvaluation}, Setup Price: ${setupPriceEvaluation}, Skipping!`);
                return true;
            }
        } catch (error) {
            console.log(`Product does not match our price range and prices.`);
            return false;
        }
    };

    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('Confirming product type check...');
    const productTypeCheck = await newPage.$eval('#ctl00_ctl00_C_M_ctl00_W_ctl01__Type', el => el.textContent);
    console.log('Product type: ', productTypeCheck);

    if (productTypeCheck === productType) {
        console.log('Product type matches our desired type. proceeding!');
    } else {
        throw new Error(`Product type does not match our desired type. Expected: ${productType}, Got: ${productTypeCheck}`);
    }
    await newPage.evaluate(() => {
        window.scrollTo(0, 0);
    });

    console.log('confirming product name check...');
    await newPage.$(productNameSelector);
    await newPage.waitForSelector(productNameSelector);
    console.log('Found product name selector');

    const productNameEvaluation = await newPage.$eval(productNameSelector, el => el.value.trim());

    if (productNameEvaluation !== productName) {
        throw new Error(`Product name does not match. Expected: ${productName}, instead got ${productNameEvaluation} aborting process.`);
    };
    console.log('Product name matches, proceeding with autofill!, product name: ', productName);

    if (product.DisplayName) {
        console.log('Product details are skipped for product: ', product.ItemName);
    } else if (!await productQueriedCheck(newPage, product) && product.DisplayName) {
        await fillProductInfo(newPage, product);
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    const evaluatedItemTemplate = await newPage.$eval('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$txtMISEstimateId"]', el => el.value.trim());
    console.log("Evaluated item template name: ", evaluatedItemTemplate);
    if (product.ItemTemplate) {
        console.log('Filling Item template field with: ', product.ItemTemplate);
        if (evaluatedItemTemplate !== product.ItemTemplate) {
            await fillItemTemplate(newPage, product);
            console.log('Item template typed: ', product.ItemTemplate);
        } else {
            console.log('Item template already exists. Skipping');
        }
    } else {
        console.log('Item template field explicitly skipped!');
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    if (product.BriefDescription) {
        const htmlElement = await newPage.$('.reEditorModes ul li:nth-of-type(2)');
        if (htmlElement) {
            console.log('Found brief description selector');
            await htmlElement.click();
            console.log('Entering into html textarea');
            await completeDelete(newPage, platform);
            await newPage.type('textarea.reTextArea', briefDescription);
            console.log('Filled brief description with: ', briefDescription);
        } else {
            console.log('Brief description selector not found');
        }
    } else {
        console.log('Brief description field explicitly skipped!');
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    if (allowIconFields && icon) {
        console.log('Icon field enabled');
        const blankImage = await newPage.$('img[src="/DSF/Images/a6b0f33a-f440-4378-8e9a-bb320ee87610/Blanks/27.gif"]');
        if (blankImage) {
            console.log('Icon field blank. Uploading!');
            await uploadIcon(newPage, icon);
        } else if (!blankImage && allowIconFields && product.Icon) {
            try {
                console.log('Icon field populated but user wants to change it');
                await uploadIcon(newPage, icon);
            } catch (error) {
                console.error('Error uploading icon:', error);
            }
        } else {
            console.log('Icon field populated and no replacement. Skipping!');
        }
    } else {
        console.log('Icon field explicitly skipped!');
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    if (product.LongDescription) {
        console.log('Long description field enabled and product exists');
        await newPage.$('#TabDetails'),
            await console.log('Found details tab'),
            await newPage.waitForSelector('#TabDetails'),
            await newPage.click('#TabDetails'),
            await console.log('Details tab clicked!');
        const htmlButton = '.reEditorModes .reMode_html';
        if (await newPage.$(htmlButton)) {
            console.log('Found the html button!');
            await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01__LongDescription_ModesWrapper');
            console.log('Moused to html textarea');
            for (let i = 0; i < 2; i++) {
                await newPage.keyboard.press('Tab');
            }
        }
        if (allowDescriptionFields && product.LongDescription || productType !== 'Non Printed Products' && allowDescriptionFields && product.LongDescription) {
            if (await detectFilledDetails(newPage, product) === false) {
                await fillLongDescription(newPage, product);
            }
        }
    } else {
        console.log('Long description field explicitly skipped!');
    };

    if (productType === 'Static Document' || productType === 'Ad Hoc' || productType === 'Non Printed Products') {
        if (productType !== 'Non Printed Products') {
            await new Promise(resolve => setTimeout(resolve, 800));
            if (product.SetupPrice || product.RegularPrice || product.RangeStart || product.RangeEnd) {
                await newPage.$('#TabPricing');
                await console.log('Found pricing tab');
                await newPage.waitForSelector('#TabPricing');
                await newPage.click('#TabPricing');
                await console.log('Pricing tab clicked!');

                await new Promise(resolve => setTimeout(resolve, 800));
                if (await productPriceMatches(newPage, startingRange, endingRange, regularPrices, setupPrices) === false ||
                    (parseFloat(startingRange) !== 0 &&
                        parseFloat(endingRange) !== 0 &&
                        parseFloat(regularPrices) !== 0 &&
                        parseFloat(setupPrices) !== 0)) {
                    await fillPricingForm(newPage, startingRange, endingRange, regularPrices, setupPrices);
                };
            } else {
                console.log('Pricing fields explicitly skipped!');
            }
        };

        if (await newPage.$('#TabSettings')) {
            await console.log('Found settings tab');
            await newPage.waitForSelector('#TabSettings');
            await newPage.click('#TabSettings');
        } else {
            console.warn('Settings tab not found.');
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        if (productType !== 'Non Printed Products' && productType !== 'Ad Hoc') {
            if (!buyerConfigs) {
                console.log('buyer configuation is set to false');
                await newPage.waitForSelector("#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_1");
                await newPage.click("#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_1");
                const allowBuyerFalse = await newPage.$eval("#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_1", (element) => {
                    return {
                        id: element.id,
                        checked: element.checked,
                    }
                })
                if (!allowBuyerFalse.checked) {
                    console.log('Waiting for configuration to change before continuing');
                    await new Promise(resolve => setTimeout(resolve, 1200));
                }
                console.log('configuration changed to false or no');
            } else {
                console.log('buyer configuation is set to true');
                await newPage.waitForSelector("#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_0");
                await newPage.click("#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_0");
                const allowBuyerTrue = await newPage.$eval("#ctl00_ctl00_C_M_ctl00_W_ctl01_AllowBuyerConfigurationRadioButton_0", (element) => {
                    return {
                        id: element.id,
                        checked: element.checked,
                    }
                })
                console.log('configuration changed to true or yes');
                if (!allowBuyerTrue.checked) {
                    console.log('Waiting for configuration to change before continuing');
                    await new Promise(resolve => setTimeout(resolve, 1200));
                }
            }
        } else {
            console.log(`Product type incompatible with buyer configuration: ${productType}, proceeding to skip this step`);
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        await settingsTab(
            newPage,
            anyQuantitiesButton,
            advancedQuantitiesButton,
            advancedRanges,
            orderQuantities,
            shippingWidths,
            shippingHeights,
            shippingLengths,
            shippingMaxs,
            weightInput,
            maxQuantity,
            showQtyPrice,
        );
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    const nextButton = '#ctl00_ctl00_C_M_ctl00_W_StartNavigationTemplateContainerID_Button1';
    await newPage.waitForSelector(nextButton);
    await newPage.click(nextButton);

    // Adding a check for different product types of this step (Static Document, Product Matrix, or Ad Hoc Product)
    if (productType !== 'Non Printed Products' && productType !== 'Ad Hoc') {
        await new Promise(resolve => setTimeout(resolve, 1200));
        if (productType === 'Static Document' && product.PDFUploadName) {
            const pdfTitle = await newPage.$('#ctl00_ctl00_C_M_ctl00_W_ctl02_FilesAddedToJob1_FileRepeater_ctl01_UF_FN');
            const pdfTitleEvaluation = await pdfTitle.evaluate(el => el.textContent);
            await console.log('PDF Title: ', pdfTitleEvaluation);
            if (pdfTitleEvaluation !== product.PDFUploadName) {
                console.log('PDF does not match! Uploading PDF: ', product.PDFUploadName);
                await uploadPDF(newPage, pdf);
            } else {
                console.log('PDF matches. Skipping PDF upload procedure');
            };

            await new Promise(resolve => setTimeout(resolve, 800));
            await newPage.waitForSelector('input[name="ctl00$ctl00$C$M$ctl00$W$ctl02$Fileupload1$htmlInputFileUpload"]');
            console.log('File Page Loaded Successfully');
        } else if (productType === 'Product Matrix') {
            console.warn('Product Matrix type not yet supported');
        } else if (!productType.PDFUploadName) {
            console.log('PDF upload field is skipped!');
        };
        await newPage.waitForSelector('input[name="ctl00$ctl00$C$M$ctl00$W$StepNavigationTemplateContainerID$StepNextButton"]');
        await newPage.click('input[name="ctl00$ctl00$C$M$ctl00$W$StepNavigationTemplateContainerID$StepNextButton"]');

        await new Promise(resolve => setTimeout(resolve, 800));
        if (productType === 'Static Document') {
            await ticketTemplateSelector(ticketTemplates, newPage);
        } else {
            console.log(`No support for ${productType} yet, proceeding to next step`);
        };
    } else if (productType === 'Ad Hoc') {
        if (productType.TicketTemplate) {
            console.log('Ad Hoc product type detected, proceeding to ticket template selector');
            await ticketTemplateSelector(ticketTemplates, newPage);
        } else {
            console.log('Ad Hoc product type detected, but no ticket template provided. Skipping this step.');
        }
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('Found save and exit button');
    await newPage.waitForSelector('input[value="Save & Exit"]');
    await newPage.click('input[value="Save & Exit"]');
    console.log('Clicked save and exit button');
    await page.bringToFront();
    console.log('Returned to main page');
};

async function runPuppeteer(products) {
    let processedProductCount = 0;
    try {
        browser = await puppeteer.launch({ headless: false, args: ['--window-size=1920,1080'] });
        const page = await browser.newPage();
        await page.setViewport({ width: globalWidth, height: globalHeight });
        await page.goto('https://store.bender-inc.com/DSF/Admin/AdminHome.aspx');

        await page.waitForSelector('input[ng-model="data.UserName"]', { visible: true });
        await page.click('input[ng-model="data.UserName"]');
        await page.type('input[ng-model="data.UserName"]', username);
        await page.click('#loginPwd');
        await page.type('#loginPwd', password);
        await page.click('.login-button');

        await page.waitForSelector('a[href="MD/base.aspx#/manageproducts"]', { visible: true });
        await page.click('a[href="MD/base.aspx#/manageproducts"]');

        console.log(`Total products to process: ${products.length}`);
        sound.play(activateSound);

        for (const product of products) {
            console.log(`Processing product ${processedProductCount + 1}/${products.length}`);
            await processProduct(browser, page, product);
            processedProductCount++;
            if (processedProductCount === products.length) {
                console.log('All products processed successfully');
                await sendSuccessEmail(processedProductCount, products);
                sound.play(successSound);
            } else {
                console.log(`Processed ${processedProductCount}/${products.length} products so far.`);
            }
        }
    } catch (error) {
        const page = await browser.newPage();
        sound.play(errorSound);
        await sendFailureEmail(processedProductCount, products, error);
        console.error('An error occurred:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

async function closeBrowser() {
    if (browser) {
        console.log('Closing browser...');
        await browser.close();
        browser = null;
    } else {
        console.log('No browser instance found.');
        throw error;
    }
};

module.exports = { runPuppeteer, closeBrowser };