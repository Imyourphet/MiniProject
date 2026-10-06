const oracledb = require("oracledb");
require("dotenv").config();
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString:
        `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
};
async function getConnection() {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        return connection;
    } catch (error) {
        console.error("Oracle Connection Error:");
        console.error(error);
        throw error;
    }
}
module.exports = {
    getConnection,
};