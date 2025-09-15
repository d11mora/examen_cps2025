const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASS,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DB,
    options: {
        encrypt: process.env.SQL_ENCRYPT === 'true',
        trustServerCertificate: true,
        instanceName: process.env.SQL_INSTANCE || undefined
    }
};

let pool;

async function getPool() {
    if (pool && pool.connected) return pool;
    pool = await sql.connect(config);
    return pool;
}

module.exports = { sql, getPool };
