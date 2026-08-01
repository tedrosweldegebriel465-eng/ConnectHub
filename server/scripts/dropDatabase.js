/**
 * ============================================
 * DROP DATABASE SCRIPT
 * Version: 2.0.0
 * Description: Safely drop the entire database
 *              with confirmation and safety checks
 * ============================================
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');
const fs = require('fs');
const chalk = require('chalk');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Require additional confirmation for production
  requireDoubleConfirmation: process.env.NODE_ENV === 'production',
  // Backup collections before dropping (optional)
  backupBeforeDrop: false,
  // Log file path
  logFile: path.join(__dirname, '../../logs/drop-database.log'),
};

// ============================================
// LOGGING
// ============================================

const log = {
  info: (msg) => {
    console.log(chalk.blue('ℹ️') + ' ' + msg);
    appendLog('INFO', msg);
  },
  success: (msg) => {
    console.log(chalk.green('✅') + ' ' + msg);
    appendLog('SUCCESS', msg);
  },
  warning: (msg) => {
    console.log(chalk.yellow('⚠️') + ' ' + msg);
    appendLog('WARNING', msg);
  },
  error: (msg) => {
    console.log(chalk.red('❌') + ' ' + msg);
    appendLog('ERROR', msg);
  },
  danger: (msg) => {
    console.log(chalk.red.bold('🔴') + ' ' + chalk.red.bold(msg));
    appendLog('DANGER', msg);
  },
};

function appendLog(level, message) {
  try {
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(CONFIG.logFile, logEntry);
  } catch (err) {
    // Silently fail if logging fails
  }
}

// ============================================
// READLINE INTERFACE
// ============================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => {
  rl.question(query, resolve);
});

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectToDatabase() {
  try {
    log.info('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;
    
    log.success(`Connected to database: ${dbName} on ${host}`);
    return { dbName, host };
    
  } catch (error) {
    log.error(`Failed to connect to database: ${error.message}`);
    throw error;
  }
}

// ============================================
// GET DATABASE INFO
// ============================================

async function getDatabaseInfo() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    const totalCollections = collectionNames.length;
    
    let totalDocuments = 0;
    for (const name of collectionNames) {
      const count = await mongoose.connection.db.collection(name).countDocuments();
      totalDocuments += count;
    }
    
    return {
      collections: collectionNames,
      totalCollections,
      totalDocuments,
    };
  } catch (error) {
    log.warning(`Could not get database info: ${error.message}`);
    return {
      collections: [],
      totalCollections: 0,
      totalDocuments: 0,
    };
  }
}

// ============================================
// BACKUP DATABASE (Optional)
// ============================================

async function backupDatabase(dbName) {
  if (!CONFIG.backupBeforeDrop) {
    return;
  }
  
  try {
    log.info('Creating backup before dropping...');
    
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${dbName}-${timestamp}.backup`);
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Create backup file
    const backupData = {
      timestamp: new Date().toISOString(),
      database: dbName,
      collections: {},
    };
    
    for (const collection of collections) {
      const data = await mongoose.connection.db
        .collection(collection.name)
        .find({})
        .toArray();
      backupData.collections[collection.name] = data;
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    log.success(`Backup created: ${backupPath}`);
    
  } catch (error) {
    log.warning(`Backup failed: ${error.message}`);
  }
}

// ============================================
// DROP DATABASE
// ============================================

async function dropDatabase() {
  try {
    // Display warning banner
    console.log('\n' + chalk.red.bold('='.repeat(60)));
    console.log(chalk.red.bold('  ⚠️  DANGER: DATABASE DROP OPERATION  ⚠️  '));
    console.log(chalk.red.bold('='.repeat(60)) + '\n');
    
    // Connect to database
    const { dbName, host } = await connectToDatabase();
    
    // Get database info
    const dbInfo = await getDatabaseInfo();
    
    // Display database info
    console.log('\n' + chalk.cyan('📊 Database Information:'));
    console.log(`  • Database: ${chalk.bold(dbName)}`);
    console.log(`  • Host: ${chalk.bold(host)}`);
    console.log(`  • Collections: ${chalk.bold(dbInfo.totalCollections)}`);
    console.log(`  • Total Documents: ${chalk.bold(dbInfo.totalDocuments.toLocaleString())}`);
    
    if (dbInfo.totalCollections > 0) {
      console.log(`  • Collections: ${chalk.gray(dbInfo.collections.join(', '))}`);
    }
    console.log('');
    
    // First confirmation
    log.danger('⚠️  THIS ACTION IS PERMANENT AND CANNOT BE UNDONE! ⚠️');
    console.log('');
    
    const confirm1 = await question(
      chalk.yellow(`Are you sure you want to drop the database "${dbName}"? (yes/no): `)
    );
    
    if (confirm1.toLowerCase() !== 'yes') {
      log.info('Operation cancelled by user.');
      rl.close();
      process.exit(0);
    }
    
    // Second confirmation for production
    if (CONFIG.requireDoubleConfirmation) {
      console.log('');
      log.warning('Production environment detected. Additional confirmation required.');
      
      const confirm2 = await question(
        chalk.red.bold(`Type the database name "${dbName}" to confirm: `)
      );
      
      if (confirm2.trim() !== dbName) {
        log.error(`Database name mismatch. Expected "${dbName}", got "${confirm2}"`);
        log.info('Operation cancelled.');
        rl.close();
        process.exit(0);
      }
    }
    
    // Optional backup
    if (CONFIG.backupBeforeDrop) {
      await backupDatabase(dbName);
    }
    
    // Final confirmation
    console.log('');
    const confirmFinal = await question(
      chalk.red.bold(`Type "DROP" to permanently delete all data: `)
    );
    
    if (confirmFinal.trim().toUpperCase() !== 'DROP') {
      log.info('Operation cancelled.');
      rl.close();
      process.exit(0);
    }
    
    // Execute drop
    log.info('Dropping database...');
    await mongoose.connection.dropDatabase();
    
    log.success(`✅ Database "${dbName}" dropped successfully!`);
    log.success(`✅ ${dbInfo.totalDocuments.toLocaleString()} documents deleted.`);
    
    // Display final message
    console.log('\n' + chalk.green.bold('='.repeat(60)));
    console.log(chalk.green.bold('  ✅ DROP OPERATION COMPLETED SUCCESSFULLY  ✅'));
    console.log(chalk.green.bold('='.repeat(60)) + '\n');
    
    rl.close();
    process.exit(0);
    
  } catch (error) {
    log.error(`Error dropping database: ${error.message}`);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

// ============================================
// HANDLE PROCESS SIGNALS
// ============================================

process.on('SIGINT', () => {
  log.info('Process interrupted by user.');
  rl.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('Process terminated.');
  rl.close();
  process.exit(0);
});

// ============================================
// RUN
// ============================================

// Check if running in production without confirmation
if (process.env.NODE_ENV === 'production' && !process.env.FORCE_DROP) {
  console.log(chalk.red.bold('\n⚠️  PRODUCTION ENVIRONMENT DETECTED'));
  console.log(chalk.yellow('This script requires additional confirmation in production.\n'));
  console.log(chalk.gray('To force drop in production, set the FORCE_DROP environment variable:'));
  console.log(chalk.gray('  FORCE_DROP=true npm run db:drop\n'));
}

// Start the drop process
dropDatabase();