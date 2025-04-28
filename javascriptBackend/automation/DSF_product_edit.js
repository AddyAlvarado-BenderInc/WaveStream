const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sound = require('sound-play');
const sgMail = require('@sendgrid/mail');
const { error } = require('console');

const activateSound = path.join(__dirname, 'sounds', 'activate.wav');
const errorSound = path.join(__dirname, 'sounds', 'error.wav');
const successSound = path.join(__dirname, 'sounds', 'success.wav');

const username = process.env.DSF_USERNAME;
const password = process.env.DSF_PASSWORD;
const sendgridApi = process.env.SENDGRID_API_KEY;;

const userEmail = process.env.USER_EMAIL;
const secondaryEmail = process.env.SECONDARY_EMAIL;

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

const globalWidth = 1920;
const globalHeight = 1080;

const ticketSelectorValues = {
    "default": "100289",
    "4/4": "100290",
    "4/0_No_Special_Instructions": "100520",
    "4/4_No_Special_Instructions": "100521",
}

// TODO: Detect user's OS and flip the function below based on OS detected
async function completeDelete(newPage) {
    // Below command is Windows deprecated, uncomment when on Mac and comment out redundant code!
    // await newPage.evaluate(() => document.execCommand('selectall', false, null));
    await newPage.keyboard.down('Control');
    await newPage.keyboard.press('A');
    await newPage.keyboard.up('Control');
    await newPage.keyboard.press('Backspace');
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

// TODO: Eventually we should have a "Delete current icon" option in the future.
async function uploadIcon(newPage, icon) {
    const filePath = path.join(__dirname, 'icons', icon);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Icon "${icon}" not found in ./icons directory`);
    }

    await console.log(`Uploading icons: ${icon}`);

    await new Promise(resolve => setTimeout(resolve, 600));
    await newPage.waitForSelector('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$EditProductImage"]');
    await newPage.click('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$EditProductImage"]');

    await newPage.waitForSelector('#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_rdbUploadIcon');
    await newPage.click('#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_rdbUploadIcon');

    const uploadSelector = await newPage.$('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$_uploadedFile$ctl01"]');
    await uploadSelector.uploadFile(filePath);

    await new Promise(resolve => setTimeout(resolve, 800));
    await newPage.waitForSelector('#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_ChkUseSameImageIcon');
    await newPage.click('#ctl00_ctl00_C_M_ctl00_W_ctl01__BigIconByItself_ProductIcon_ChkUseSameImageIcon');

    await new Promise(resolve => setTimeout(resolve, 600));
    await newPage.waitForSelector('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$Upload"]');
    await newPage.click('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$Upload"]');
    await Promise.all([
        newPage.waitForNavigation(),
    ]);
    console.log('Page reloaded successfully');

    await new Promise(resolve => setTimeout(resolve, 600));
    if (await newPage.$('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$Upload"]')) {
        console.log(`Waiting for file to completely upload`);
        await newPage.waitForSelector('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$_BigIconByItself$ProductIcon$Upload"]', { hidden: true });
    } else {
        console.log(`Successfully uploaded icons: ${icon}`);
    }
};

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
    let range = 0;
    for (let i = 0; i < 2; i++) {
        const ranges = await page.$$(`#tbl_0_PriceCatalog_rngbegin_${i + 1}`);
        ranges.forEach(foundRange => {
            foundRange = range++;
        });
    }
    console.log(`Found ${range} ranges.`);
    return range;
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
    await completeDelete(newPage);
    await newPage.type(itemTemplateSelector, product.ItemTemplate);
}

async function fillProductInfo(newPage, product) {
    let nameDisplay = product.DisplayName ? product.DisplayName : "";
    const displayNameSelector = '#ctl00_ctl00_C_M_ctl00_W_ctl01__StorefrontName';
    await newPage.waitForSelector(displayNameSelector);
    console.log('Display selector found!')
    await newPage.click(displayNameSelector, { clickCount: 4 });
    await new Promise(resolve => setTimeout(resolve, 600));
    await completeDelete(newPage);
    await newPage.type(displayNameSelector, nameDisplay);
    await console.log('Display name typed: ', nameDisplay);
};

async function fillPricingForm(newPage, startingRange, endingRange, regularPrices, setupPrices) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Fill pricing procedure called');

    // TODO: To scale these variables, we should set the ending number or the '_1' as a template literal
    // so users can set the ending number instead of hardcoding the ending number.
    const beginRangeSelector = `#tbl_0_PriceCatalog_rngbegin_1`;
    const endRangeSelector = `#tbl_0_PriceCatalog_rngend_1`;
    const regularPriceSelector = `#tbl_0_PriceCatalog_regularprice_1`;
    const setupPriceSelector = `#tbl_0_PriceCatalog_setupprice_1`;

    const deleteRangeButton = 'img[onclick^="Javascript:delRow"][height="17"][width="16"]';

    if (await detectMultipleRanges(newPage) >= 2) {
        console.log('Multiple ranges detected.');
        await newPage.$(deleteRangeButton);
        await console.log('Delete selector exists')
        await newPage.waitForSelector(deleteRangeButton);
        await newPage.click(deleteRangeButton);
        await console.log('Deleted range!')
    } else {
        console.log('Multiple ranges not detected. Proceeding with range input.');
    };

    if (await newPage.$(beginRangeSelector) !== null) {
        await newPage.waitForSelector(beginRangeSelector);
        await newPage.click(beginRangeSelector, { clickCount: 4 });
        await new Promise(resolve => setTimeout(resolve, 600));
        await completeDelete(newPage);
        await newPage.type(beginRangeSelector, startingRange);
        await console.log('Filled beginning range with: ', startingRange);
    } else {
        throw new Error('Begin Range field not found');
    };

    if (await newPage.$(endRangeSelector) !== null && endRangeSelector == true) {
        await newPage.waitForSelector(endRangeSelector);
        await newPage.click(endRangeSelector, { clickCount: 4 });
        await new Promise(resolve => setTimeout(resolve, 600));
        await completeDelete(newPage);
        await console.log('Pressed backspace');
        await newPage.type(endRangeSelector, endingRange);
        await new Promise(resolve => setTimeout(resolve, 600));
        await console.log('Filled ending range with: ', endingRange);
    } else {
        console.log(`End Range field empty or not found. Skipping.`);
    };

    if (await newPage.$(regularPriceSelector) !== null) {
        await newPage.waitForSelector(regularPriceSelector);
        await newPage.click(regularPriceSelector, { clickCount: 4 });
        console.log('Clicked regular price');
        await new Promise(resolve => setTimeout(resolve, 600));
        await completeDelete(newPage);
        await newPage.type(regularPriceSelector, regularPrices);
        await console.log('Filled regular price with: ', regularPrices);
    } else {
        throw new Error('Regular price field not found');
    };

    if (await newPage.$(setupPriceSelector) !== null) {
        await newPage.waitForSelector(setupPriceSelector);
        await newPage.click(setupPriceSelector, { clickCount: 4 });
        await new Promise(resolve => setTimeout(resolve, 600));
        await completeDelete(newPage);
        await newPage.type(setupPriceSelector, setupPrices);
        await console.log('Filled setup price with: ', setupPrices);
    } else {
        throw new Error('Setup price field not found');
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
        await completeDelete(newPage);
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
    const allowIconFields = false;
    const allowDescriptionFields = false;

    console.log('Processing for product:', product.ItemName);

    if (!product.ItemName || typeof product.ItemName !== 'string') {
        console.error('Invalid product name:', product.ItemName);
        throw new Error('Invalid product name');
    };

    await page.waitForSelector('input[name="globaleSearch"]');
    const searchBar = 'input[name="globaleSearch"]';

    await page.click(searchBar, { clickCount: 6 });

    await completeDelete(page);

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
                await newPage.type('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$_Expression"]', advancedRanges);
            default:
                await newPage.waitForSelector(advancedQuantitiesButton);
                await newPage.click(advancedQuantitiesButton);
                await console.log('Nothing Specified, Defaulting to 1 Qty for selected quantity: ', orderQuantities);
                await newPage.type('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$_Expression"]', '1');
                break;
        };

        const maxQtySelector = 'input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$OrderQuantitiesCtrl$txtMaxOrderQuantityPermitted"]';
        const showQtyPriceSelector = 'input[value="rdbShowPricing"]';
        const maxQtySelectorValue = await newPage.$eval(maxQtySelector, el => el.value.trim());

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
                await completeDelete(newPage);
                if (maxQtySelector !== maxQuantity) {
                    // TODO: we'll have to solve this later instead of commenting it out, stupid freaking csv files and your unreliably sad interface >;(
                    // await newPage.type(maxQtySelector, maxQuantity);
                    // console.log('Filled max quantity with: ', maxQuantity);
                } else {
                    console.log('Max quantity is empty, skipping!');
                }
            };
        };

        await new Promise(resolve => setTimeout(resolve, 800));
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
                await completeDelete(newPage);
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

        await new Promise(resolve => setTimeout(resolve, 3000));
        if (await newPage.$eval(widthSelector, el => el.value.trim()) !== shippingWidths) {
            console.log('Processing Width');
            await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl__lblBoxX');
            await new Promise(resolve => setTimeout(resolve, 800));
            await newPage.keyboard.press('Tab');

            await completeDelete(newPage);

            await newPage.keyboard.type(shippingWidths);
            if (await newPage.$eval(widthSelector, el => el.value.trim()) === shippingWidths) {
                console.log('Completed filling shipping widths with: ', shippingWidths);
            } else {
                throw new Error('Failed to fill shipping widiths');
            }
        } else {
            console.log('Width is already set to: ', shippingWidths);
        };
        if (await newPage.$eval(lengthSelector, el => el.value.trim()) !== shippingLengths) {
            console.log('Processing Length');
            await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl__lblBoxY');
            await newPage.keyboard.press('Tab');

            await completeDelete(newPage);

            await newPage.keyboard.type(shippingLengths);
            if (await newPage.$eval(lengthSelector, el => el.value.trim()) === shippingLengths) {
                console.log('Completed filling shipping widths with: ', shippingLengths);
            } else {
                throw new Error('Failed to fill shipping lengths');
            }
        } else {
            console.log('Length is already set to: ', shippingLengths);
        };
        if (await newPage.$eval(heightSelector, el => el.value.trim()) !== shippingHeights) {
            console.log('Processing Height');
            await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl__lblBoxZ');
            await newPage.keyboard.press('Tab');

            await completeDelete(newPage);

            await newPage.keyboard.type(shippingHeights);
            if (await newPage.$eval(heightSelector, el => el.value.trim()) === shippingHeights) {
                console.log('Completed filling shipping widths with: ', shippingHeights);
            } else {
                throw new Error('Failed to fill shipping heights');
            }
        } else {
            console.log('Height is already set to: ', shippingHeights);
        };
        if (await newPage.$eval(maxSelector, el => el.value.trim()) !== shippingMaxs) {
            console.log('Processing Max');
            await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01_ShipmentDimensionCtrl_lblLotSize');
            await newPage.keyboard.press('Tab');

            await completeDelete(newPage);

            await newPage.keyboard.type(shippingMaxs);
            if (await newPage.$eval(maxSelector, el => el.value.trim()) === shippingMaxs) {
                console.log('Completed filling shipping widths with: ', shippingMaxs);
            } else {
                throw new Error('Failed to fill shipping maxs');
            }
        } else {
            console.log('Max is already set to: ', shippingMaxs);
        };
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

    if (product.DisplayName === '!SKIP' && product.DisplayName) {
        console.log('Product details are skipped for product: ', product.ItemName);
    } else if (!await productQueriedCheck(newPage, product) && product.DisplayName !== '!SKIP' && product.DisplayName) {
        await fillProductInfo(newPage, product);
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    const evaluatedItemTemplate = await newPage.$eval('input[name="ctl00$ctl00$C$M$ctl00$W$ctl01$txtMISEstimateId"]', el => el.value.trim());
    console.log("Evaluated item template name: ", evaluatedItemTemplate);
    if (product.ItemTemplate !== '!SKIP' && product.ItemTemplate) {
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

    // TODO: in the future, we should have a toggle that allows
    // the user to enable or disable the icon field entirely.
    await new Promise(resolve => setTimeout(resolve, 600));
    if (allowIconFields) {
        console.log('Icon field enabled');
        const blankImage = await newPage.$('img[src="/DSF/Images/a6b0f33a-f440-4378-8e9a-bb320ee87610/Blanks/27.gif"]');
        if (blankImage) {
            console.log('Icon field blank. Uploading!');
            await uploadIcon(newPage, icon);
        } else {
            console.log('Icon field populated. Skipping!');
        }
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    await newPage.$('#TabDetails'),
        await console.log('Found details tab'),
        await newPage.waitForSelector('#TabDetails'),
        await newPage.click('#TabDetails'),
        await console.log('Details tab clicked!');
    const htmlButton = '.reEditorModes .reMode_html';
    if (await newPage.$(htmlButton)) {
        console.log('Found the html button!');
        await simulateMouseMove(newPage, '#ctl00_ctl00_C_M_ctl00_W_ctl01__LongDescription_contentDiv');
        for (let i = 0; i < 2; i++) {
            await newPage.keyboard.press('Tab');
        }
        await newPage.keyboard.press('Enter');
    }
    if (product.LongDescription !== '!SKIP' && allowDescriptionFields || productType !== 'Non Printed Products' && allowDescriptionFields) {
        if (await detectFilledDetails(newPage, product) === false) {
            await fillLongDescription(newPage, product);
        }
    } else {
        console.log('Long description field explicitly skipped!');
    }

    if (productType === 'Static Document' || productType === 'Ad Hoc' || productType === 'Non Printed Products') {
        if (productType !== 'Non Printed Products') {
            await new Promise(resolve => setTimeout(resolve, 800));
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
        };

        if (await newPage.$('#TabSettings')) {
            await console.log('Found settings tab');
            await newPage.waitForSelector('#TabSettings');
            await newPage.click('#TabSettings');
        } else {
            console.warn('Settings tab not found.');
        }

        await new Promise(resolve => setTimeout(resolve, 800));
        if (productType !== 'Non Printed Products') {
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
    await simulateMouseMove(newPage, nextButton);
    await newPage.keyboard.press('Enter');

    // Adding a check for different product types of this step (Static Document, Product Matrix, or Ad Hoc Product)
    if (productType !== 'Non Printed Products') {
        await new Promise(resolve => setTimeout(resolve, 1200));
        if (productType === 'Static Document') {
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
            // TODO: Will add support for Product Matrix in the future!
            console.warn('Product Matrix type not yet supported');
        };
        await newPage.waitForSelector('input[name="ctl00$ctl00$C$M$ctl00$W$StepNavigationTemplateContainerID$StepNextButton"]');
        await newPage.click('input[name="ctl00$ctl00$C$M$ctl00$W$StepNavigationTemplateContainerID$StepNextButton"]');

        await new Promise(resolve => setTimeout(resolve, 800));
        if (productType === 'Static Document') {
            await ticketTemplateSelector(ticketTemplates, newPage);
        } else {
            console.log(`No support for ${productType} yet, proceeding to next step`);
        };
    };

    await new Promise(resolve => setTimeout(resolve, 800));
    await newPage.waitForSelector('input[value="Save & Exit"]');
    await newPage.click('input[value="Save & Exit"]');
    await page.bringToFront();
};

async function runPuppeteer(products) {
    let browser;
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

        // TODO: In the future, when there's an interface, for when the user only wants to update certain products in the total product count
        // we should create a value that the product count will be reactive to, that way the user won't need to wait for the rest of 
        // the automation in order to return to the previous point. For now, we should just have a variable that we can change.

        console.log(`Total products to process: ${products.length}`);
        // sound.play(activateSound);

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
        // sound.play(errorSound);
        // await sendFailureEmail(processedProductCount, products, error);
        console.error('An error occurred:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = runPuppeteer;