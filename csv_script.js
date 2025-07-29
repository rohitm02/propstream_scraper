const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

// Load your input JSON file
const inputFile = path.join(__dirname, 'properties.json'); // replace if needed
const outputFile = path.join(__dirname, 'output.csv');

// Read and parse JSON
const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Prepare flattened data
const flattened = [];

jsonData.forEach((property) => {
  const baseRow = {
    id: property.id,
    title: property.title,
    blueprint: 'Primary',
    SqFt: property.SqFt || '',
    LotSize: property['Lot Size'] || '',
    YearBuilt: property['Year Built'] || '',
    PropertyType: property['Property Type'] || '',
    Status: property.Status || '',
    Distressed: property.Distressed || '',
    ShortSale: property['Short Sale'] || '',
    HOA_COA: property['HOA/COA'] || '',
    OwnerType: property['Owner Type'] || '',
    OwnerStatus: property['Owner Status'] || '',
    Occupancy: property.Occupancy || '',
    LengthOfOwnership: property['Length of Ownership'] || '',
    PurchaseMethod: property['Purchase Method'] || '',
    County: property.County || '',
    EstimatedValue: property['Estimated Value'] || ''
  };

  flattened.push(baseRow);

  if (Array.isArray(property.linkedProperties)) {
    property.linkedProperties.forEach(linked => {
      flattened.push({
        id: property.id,
        title: property.title,
        blueprint: linked.blueprint || '',
        SqFt: linked.SqFt || '',
        LotSize: linked['Lot Size'] || '',
        YearBuilt: linked['Year Built'] || '',
        PropertyType: linked['Property Type'] || '',
        Status: linked.Status || '',
        Distressed: linked.Distressed || '',
        ShortSale: linked['Short Sale'] || '',
        HOA_COA: linked['HOA/COA'] || '',
        OwnerType: linked['Owner Type'] || '',
        OwnerStatus: linked['Owner Status'] || '',
        Occupancy: linked.Occupancy || '',
        LengthOfOwnership: linked['Length of Ownership'] || '',
        PurchaseMethod: linked['Purchase Method'] || '',
        County: linked.County || '',
        EstimatedValue: linked['Estimated Value'] || ''
      });
    });
  }
});

// Set up CSV writer
const csvWriter = createObjectCsvWriter({
  path: outputFile,
  header: [
    { id: 'id', title: 'ID' },
    { id: 'title', title: 'Title' },
    { id: 'blueprint', title: 'Blueprint' },
    { id: 'SqFt', title: 'SqFt' },
    { id: 'LotSize', title: 'Lot Size' },
    { id: 'YearBuilt', title: 'Year Built' },
    { id: 'PropertyType', title: 'Property Type' },
    { id: 'Status', title: 'Status' },
    { id: 'Distressed', title: 'Distressed' },
    { id: 'ShortSale', title: 'Short Sale' },
    { id: 'HOA_COA', title: 'HOA/COA' },
    { id: 'OwnerType', title: 'Owner Type' },
    { id: 'OwnerStatus', title: 'Owner Status' },
    { id: 'Occupancy', title: 'Occupancy' },
    { id: 'LengthOfOwnership', title: 'Length of Ownership' },
    { id: 'PurchaseMethod', title: 'Purchase Method' },
    { id: 'County', title: 'County' },
    { id: 'EstimatedValue', title: 'Estimated Value' }
  ]
});

// Write CSV
csvWriter.writeRecords(flattened)
  .then(() => console.log('✅ CSV file written to:', outputFile))
  .catch(err => console.error('❌ Failed to write CSV:', err));
