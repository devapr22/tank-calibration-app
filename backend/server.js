const express = require("express");
const pool = require("./db");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.get("/test-db", async (req, res) => {

    try {

        const result =
            await pool.query("SELECT NOW()");

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).send("Database Error");
    }

});

app.post("/companies", async (req, res) => {

    try {

       const {
    name,
    contact_person,
    phone_number,
    location
} = req.body;

const result = await pool.query(
`
INSERT INTO companies
(
    name,
    contact_person,
    phone_number,
    location
)
VALUES ($1,$2,$3,$4)
RETURNING *
`,
[
    name,
    contact_person,
    phone_number,
    location
]
);

        res.status(201).json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).send("Error creating company");
    }
});
app.get("/companies", async (req, res) => {

    try {

        const result =
            await pool.query(
                "SELECT * FROM companies ORDER BY id"
            );

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).send("Error fetching companies");
    }
});
app.put("/companies/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            name,
            contact_person,
            phone_number,
            location
        } = req.body;

        const result = await pool.query(
            `
            UPDATE companies
            SET
                name = $1,
                contact_person = $2,
                phone_number = $3,
                location = $4
            WHERE id = $5
            RETURNING *
            `,
            [
                name,
                contact_person,
                phone_number,
                location,
                id
            ]
        );

        res.json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).send("Error updating company");
    }
});
app.delete("/companies/:id", async (req, res) => {

    try {

        const { id } = req.params;

        await pool.query(
            `
            DELETE FROM companies
            WHERE id = $1
            `,
            [id]
        );

        res.send("Company Deleted");

    } catch (error) {

        console.error(error);

        res.status(500).send("Error deleting company");
    }
});
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
