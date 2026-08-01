{
  "scripts": {
    "start": "node server/app.js",
    "dev": "nodemon server/app.js",
    "dev:debug": "nodemon --inspect server/app.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint server/ --ext .js",
    "lint:fix": "eslint server/ --ext .js --fix",
    "format": "prettier --write server/",
    "build": "npm run lint && npm run test",
    "seed": "node server/seeders/seeder.js",
    "db:drop": "node server/scripts/dropDatabase.js",
    "db:drop:force": "FORCE_DROP=true node server/scripts/dropDatabase.js",
    "logs": "tail -f logs/combined.log",
    "logs:error": "tail -f logs/error.log"
  }
}