const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'visitalis',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error conectando a MySQL:', err.message);
        return;
    }
    console.log('Conectado exitosamente a la base de datos MySQL (visitalis)');
    connection.release();
});

module.exports = pool.promise();