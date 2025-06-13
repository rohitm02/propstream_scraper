const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const results = [];

  // Helper functions
  const safeClick = async (selector, timeout = 5000) => {
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
      const labelSelector = `//div[contains(@class, 'src-components-GroupInfo-style__FpyDf__label')][contains(., '${label}')]`;
      await page.waitForSelector(`xpath=${labelSelector}`, { timeout: 4000 });
      
      return await page.evaluate((label) => {
        const labels = Array.from(document.querySelectorAll('div.src-components-GroupInfo-style__FpyDf__label'));
        const labelEl = labels.find(el => el.textContent.includes(label));
        return labelEl?.nextElementSibling?.textContent?.trim() || 'N/A';
      }, label);
    } catch {
      return 'N/A';
    }
  };

  try {
    // 1. Login
    await page.goto('https://login.propstream.com/', { waitUntil: 'networkidle' });
    await page.fill('input[name="username"]', 'operations@wwrdallas.com');
    await page.fill('input[name="password"]', 'Ishan0727#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/search', { timeout: 60000 });

    // 2. Load saved search
    await safeClick('text=Filter');
    await safeClick('text=Saved Searches');
    await safeClick('h4:has-text("Collin Tired Landlords")');
    await safeClick('button:has-text("View Properties")');

    // 3. Get all property links
    await page.waitForSelector('a.src-app-Search-Results-style__BKQRC__name', { timeout: 60000 });
    const propertyLinks = await page.$$('a.src-app-Search-Results-style__BKQRC__name');
    const totalProperties = Math.min(propertyLinks.length, 50);

    // 4. Process each property
    for (let i = 0; i < totalProperties; i++) {
      let propertyResult = { id: i + 1 };
      
      try {
        console.log(`\nProcessing property ${i+1}/${totalProperties}`);
        
        // Click property
        await retryOperation(async () => {
          const elements = await page.$$('a.src-app-Search-Results-style__BKQRC__name');
          await elements[i].click();
        }, 3);

        // Extract title
        propertyResult.title = await getTextSafely(
          'div.src-app-Property-Detail-style__fl01l__headerTitle',
          'Title Not Found'
        );
        console.log(`Title: ${propertyResult.title}`);

        // Click MLS Details tab
        await safeClick('text=MLS Details');
        
        // Wait for MLS data to load
        await page.waitForFunction(() => {
          const labels = Array.from(document.querySelectorAll('div[class*="label"]'));
          const priceEl = labels.find(el => el.textContent.includes('Price'));
          return priceEl?.nextElementSibling?.textContent?.trim();
          }, { timeout: 8000 });


        // Extract MLS data
        propertyResult = {
          ...propertyResult,
          statusDate: await getMLSValue('Status Date'),
          price: await getMLSValue('Price'),
          agentName: await getMLSValue('Agent Name'),
          agentPhone: await getMLSValue('Agent Phone'),
          agentEmail: await getMLSValue('Agent Email')
        };
        
        console.log('MLS Data:', {
          price: propertyResult.price,
          agent: propertyResult.agentName,
          agentPhone: propertyResult.agentPhone,
          agentEmail: propertyResult.agentEmail,
          listingDate: propertyResult.statusDate
        });


      } catch (error) {
        console.error(`❌ Error processing property ${i+1}:`, error.message);
        await page.screenshot({ path: `error_${i+1}.png` });
        propertyResult.error = error.message;
      } finally {
        // Ensure popup is closed
        await tryClosePopup(page);
        results.push(propertyResult);
        
        // Wait before next property
        await page.waitForTimeout(1500);
      }
    }

    // 5. Save results
    fs.writeFileSync('properties.json', JSON.stringify(results, null, 2));
    console.log(`\n✅ Successfully processed ${results.filter(r => !r.error).length}/${totalProperties} properties`);
    console.log('Results saved to properties.json');

  } catch (error) {
    console.error('🛑 Critical error:', error);
    await page.screenshot({ path: 'fatal_error.png' });
  } finally {
    await browser.close();
  }

  // Helper: Retry operation
  async function retryOperation(operation, retries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (err) {
        if (i === retries - 1) throw err;
        await page.waitForTimeout(1000 * (i + 1));
      }
    }
  }

  // Helper: Safe popup close
  async function tryClosePopup(page) {
    try {
      await page.keyboard.press('Escape');
      await page.waitForSelector('a.src-app-Search-Results-style__BKQRC__name', { timeout: 5000 });
    } catch {
      // Ignore if already closed
    }
  }
})();