// MongoDB Migration Script: Copy PlatformName → PortfolioTitle where missing
// Run: mongosh renew_assets --eval "load('migrate_portfolio_names.js')"
// Or paste directly in MongoDB Compass shell

// Step 1: Count documents missing PortfolioTitle
const missingCount = db.CONFIG_Inputs.countDocuments({
    PortfolioTitle: { $exists: false },
    PlatformName: { $exists: true }
});
print(`Found ${missingCount} documents missing PortfolioTitle`);

// Step 2: Copy PlatformName to PortfolioTitle where missing
if (missingCount > 0) {
    const result = db.CONFIG_Inputs.updateMany(
        {
            PortfolioTitle: { $exists: false },
            PlatformName: { $exists: true }
        },
        [{ $set: { PortfolioTitle: "$PlatformName" } }]
    );
    print(`Updated ${result.modifiedCount} documents`);
}

// Step 3: Verify - list all portfolios with their naming fields
print("\nVerification - All portfolios:");
db.CONFIG_Inputs.find({}, {
    unique_id: 1,
    PlatformName: 1,
    PortfolioTitle: 1
}).forEach(doc => {
    print(`  ${doc.unique_id}: PlatformName="${doc.PlatformName}", PortfolioTitle="${doc.PortfolioTitle}"`);
});

print("\nMigration complete!");
