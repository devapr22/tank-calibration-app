const { Pool } = require("pg");

const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
    ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: {
              rejectUnauthorized: false,
          },
      })
    : new Pool({
          user: "postgres",
          host: "localhost",
          database: "tank_calibration",
          password: "root1",
          port: 5432,
      });

module.exports = pool;

module.exports = pool;