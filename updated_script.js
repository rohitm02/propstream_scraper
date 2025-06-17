const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const results = [];

  const savedSearchNames = [
    //'Collin Tired Landlords',
    'Denton Bank Owned Equity 100 Listed Below Market',
    //'Ellis County Tired Landlord',
    //'Grayson County Tired Landlord',
    //'Cooke county commercial tired landlords',
    //'Dallas tired landlords',
    'Denton tired landlords commercial 5/5/25',
    //'Rockwall Tired Landlords MLS Sale Active',
    'Denton Bank Owned',
    //'Collin Commercial Bank Owned'
  ];

  const safeClick = async (selector, timeout = 30000) => {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    await page.click(selector);
  };

  const getTextSafely = async (selector, fallback = 'N/A') => {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      return await page.$eval(selector, el => el.textContent.trim());
    } catch {
      return fallback;
    }
  };

  const getMLSValue = async (label) => {
    try {
      const labelSelector = `//div[contains(@class, 'label')][contains(., '${label}')]`;
      await page.waitForSelector(`xpath=${labelSelector}`, { timeout: 4000 });
      return await page.evaluate((label) => {
        const labels = Array.from(document.querySelectorAll('div[class*="label"]'));
        const labelEl = labels.find(el => el.textContent.includes(label));
        return labelEl?.nextElementSibling?.textContent?.trim() || 'N/A';
      }, label);
    } catch {
      return 'N/A';
    }
  };

  const retryOperation = async (operation, retries) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (err) {
        if (i === retries - 1) throw err;
        await page.waitForTimeout(1000 * (i + 1));
      }
    }
  };

  const tryClosePopup = async () => {
    try {
      await page.keyboard.press('Escape');
      await page.waitForSelector('a.src-app-Search-Results-style__BKQRC__name', { timeout: 5000 });
    } catch {}
  };

  try {
    await page.goto('https://login.propstream.com/', { waitUntil: 'networkidle' });
    await page.fill('input[name="username"]', 'operations@wwrdallas.com');
    await page.fill('input[name="password"]', 'Ishan0727#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/search', { timeout: 60000 });

    for (const savedSearchName of savedSearchNames) {
      console.log(`\n🔍 Starting search: ${savedSearchName}`);

      await safeClick('text=Filter');
      await safeClick('div[class*="dropdownSaveSerchBtn"]');
      await safeClick(`h4:has-text("${savedSearchName}")`);
      await safeClick('button:has-text("View Properties")');

      await page.waitForSelector('a.src-app-Search-Results-style__BKQRC__name', { timeout: 60000 });
      const propertyLinks = await page.$$('a.src-app-Search-Results-style__BKQRC__name');
      const totalProperties = propertyLinks.length;

      for (let i = 0; i < totalProperties; i++) {
        let propertyResult = { id: results.length + 1, searchName: savedSearchName };

        try {
          console.log(`\n➡️ Property ${i + 1}/${totalProperties}`);

          await retryOperation(async () => {
            const elements = await page.$$('a.src-app-Search-Results-style__BKQRC__name');
            const propertyHref = await elements[i].getAttribute('href');
            propertyResult.link = `https://app.propstream.com${propertyHref}`;
            await elements[i].click();
          }, 3);

          propertyResult.title = await getTextSafely('div.src-app-Property-Detail-style__fl01l__headerTitle', 'Title Not Found');
          console.log(`Title: ${propertyResult.title}`);

          await safeClick('text=MLS Details');

          await page.waitForFunction(() => {
            const labels = Array.from(document.querySelectorAll('div[class*="label"]'));
            const priceEl = labels.find(el => el.textContent.includes('Price'));
            return priceEl?.nextElementSibling?.textContent?.trim();
          }, { timeout: 8000 });

          propertyResult = {
            ...propertyResult,
            statusDate: await getMLSValue('Status Date'),
            price: await getMLSValue('Price'),
            agentName: await getMLSValue('Agent Name'),
            agentPhone: await getMLSValue('Agent Phone'),
            agentEmail: await getMLSValue('Agent Email')
          };

          console.log('✅ MLS:', propertyResult);

        } catch (error) {
          console.error(`❌ Error on property ${i + 1}:`, error.message);
          await page.screenshot({ path: `error_${results.length + 1}.png` });
          propertyResult.error = error.message;
        } finally {
          await tryClosePopup();
          results.push(propertyResult);
          await page.waitForTimeout(200);
        }
      }
    }

    fs.writeFileSync('all_properties.json', JSON.stringify(results, null, 2));
    console.log(`\n✅ Scraped ${results.filter(r => !r.error).length} properties total`);
    console.log('📝 Results saved to all_properties.json');

  } catch (err) {
    console.error('🔥 Critical Failure:', err);
    await page.screenshot({ path: 'fatal_error.png' });
  } finally {
    await browser.close();
  }
})();
