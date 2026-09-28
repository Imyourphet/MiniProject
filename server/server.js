const express = require("express");
const cors = require("cors");
const { getConnection } = require("./db");
require("dotenv").config();
const app = express();
// =====================================
// Middleware
// =====================================

app.use(cors());
app.use(express.json());
// =====================================
// Test API
// =====================================
app.get("/", (req, res) => {
    res.json({
        message: "MUTEMP API Server Running",
    });
});
// =====================================
// GET ALL EMPLOYEES
// =====================================
app.get("/api/mutemp", async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(`
SELECT
EMPID,
EMPNAME,
EMPADDRESS,
EMPEMAIL,
EMPPASSWORD,
SALARY
FROM MUTEMP
ORDER BY EMPID
`);

        const data = result.rows.map((row) => ({
            empId: row[0],
            empname: row[1],
            empaddress: row[2],
            empemail: row[3],
            emppassword: row[4],
            salary: row[5],
        }));
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Cannot get employee data",
            error: error.message,
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// =====================================
// GET EMPLOYEE BY ID
// =====================================
app.get("/api/mutemp/:id", async (req, res) => {
    let connection;

    try {
        const empId = req.params.id;

        connection = await getConnection();
        const result = await connection.execute(
            `
SELECT
EMPID,
EMPNAME,
EMPADDRESS,
EMPEMAIL,
EMPPASSWORD,
SALARY
FROM MUTEMP
WHERE EMPID = :empId
`,
            {
                empId: empId,
            },
        );
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }
        const row = result.rows[0];
        const employee = {
            empId: row[0],
            empname: row[1],
            empaddress: row[2],
            empemail: row[3],
            emppassword: row[4],
            salary: row[5],
        };

        res.json(employee);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Cannot get employee",
            error: error.message,
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// =====================================
// CREATE EMPLOYEE
// =====================================
app.post("/api/mutemp", async (req, res) => {
    let connection;

    try {
        const { empId, empname, empaddress, empemail, emppassword, salary } =
            req.body;
        connection = await getConnection();
        await connection.execute(
            `
INSERT INTO MUTEMP
(
EMPID,
EMPNAME,

EMPADDRESS,
EMPEMAIL,
EMPPASSWORD,
SALARY
)
VALUES
(
:empId,
:empname,
:empaddress,
:empemail,
:emppassword,
:salary
)
`,
            {
                empId,
                empname,
                empaddress,
                empemail,
                emppassword,
                salary,
            },
            {
                autoCommit: true,
            },
        );
        res.status(201).json({
            message: "Employee created successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({

            message: "Cannot create employee",
            error: error.message,
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// =====================================
// UPDATE EMPLOYEE
// =====================================
app.put("/api/mutemp/:id", async (req, res) => {
    let connection;
    try {
        const empId = req.params.id;
        const { empname, empaddress, empemail, emppassword, salary } = req.body;
        connection = await getConnection();
        const result = await connection.execute(
            `
UPDATE MUTEMP
SET
EMPNAME = :empname,
EMPADDRESS = :empaddress,
EMPEMAIL = :empemail,
EMPPASSWORD = :emppassword,
SALARY = :salary
WHERE EMPID = :empId
`,

            {
                empId,
                empname,
                empaddress,
                empemail,
                emppassword,
                salary,
            },
            {
                autoCommit: true,
            },
        );
        if (result.rowsAffected === 0) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }
        res.json({
            message: "Employee updated successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Cannot update employee",
            error: error.message,
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

// =====================================
// DELETE EMPLOYEE
// =====================================
app.delete("/api/mutemp/:id", async (req, res) => {
    let connection;
    try {
        const empId = req.params.id;
        connection = await getConnection();
        const result = await connection.execute(
            `
DELETE FROM MUTEMP
WHERE EMPID = :empId
`,
            {
                empId,
            },
            {
                autoCommit: true,
            },
        );
        if (result.rowsAffected === 0) {
            return res.status(404).json({
                message: "Employee not found",
            });
        }
        res.json({
            message: "Employee deleted successfully",
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Cannot delete employee",
            error: error.message,
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// =====================================
// START SERVER
// =====================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});